import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VideoStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { verifyPassword } from "../common/utils/crypto";
import { serializeVideo, toSafeUser } from "../common/utils/serializers";
import type { AppConfiguration } from "../config/configuration";
import { currentMonth, getPlan } from "../config/plans";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { ChangePasswordDto, DeleteAccountDto, UpdateProfileDto } from "./dto/users.dto";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const [usage, apiKeys, videoCount] = await Promise.all([
      this.prisma.usageRecord.findUnique({
        where: { userId_month: { userId, month: currentMonth() } },
      }),
      this.prisma.apiKey.count({ where: { userId, revokedAt: null } }),
      this.prisma.video.count({ where: { userId } }),
    ]);

    const plan = getPlan(user.plan);
    return {
      user: toSafeUser(user),
      plan,
      limits: {
        monthlyAnalyses: plan.monthlyAnalyses,
        maxUploadBytes: Math.min(
          plan.maxUploadBytes,
          this.config.get("maxUploadBytes", { infer: true }),
        ),
        maxVideoSeconds: plan.maxVideoSeconds,
        maxApiKeys: plan.maxApiKeys,
        retentionDays: plan.retentionDays,
      },
      usage: {
        month: currentMonth(),
        analyses: usage?.analyses ?? 0,
        bytes: Number(usage?.bytes ?? 0),
        remaining: Math.max(0, plan.monthlyAnalyses - (usage?.analyses ?? 0)),
      },
      counts: { apiKeys, videos: videoCount },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name?.trim() || null },
    });
    return { user: toSafeUser(user) };
  }

  async changePassword(user: AuthenticatedUser & { sessionId?: string }, dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto.currentPassword, dto.newPassword);
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    return {
      sessions: sessions.map((session) => ({
        ...session,
        current: session.id === currentSessionId,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException("Session not found");
    return { message: "Session revoked" };
  }

  async getStats(userId: string) {
    const month = currentMonth();
    const [counts, usage, recentVideos, recentAnalyses, scoreAggregate] = await Promise.all([
      this.prisma.video.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.usageRecord.findUnique({ where: { userId_month: { userId, month } } }),
      this.prisma.video.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { analysis: true },
      }),
      this.prisma.analysis.findMany({
        where: { video: { userId } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { fakeScore: true, verdict: true, createdAt: true, videoId: true },
      }),
      this.prisma.analysis.aggregate({
        where: { video: { userId } },
        _avg: { fakeScore: true },
        _count: { _all: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(VideoStatus).map((status) => [
        status,
        counts.find((row) => row.status === status)?._count._all ?? 0,
      ]),
    ) as Record<VideoStatus, number>;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, emailVerifiedAt: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException("User not found");
    const plan = getPlan(user.plan);

    return {
      counts: statusCounts,
      totalVideos: Object.values(statusCounts).reduce((sum, value) => sum + value, 0),
      totalAnalyses: scoreAggregate._count._all,
      averageScore:
        scoreAggregate._avg.fakeScore === null ? null : Math.round(scoreAggregate._avg.fakeScore),
      usage: {
        analyses: usage?.analyses ?? 0,
        remaining: Math.max(0, plan.monthlyAnalyses - (usage?.analyses ?? 0)),
        limit: plan.monthlyAnalyses,
        month,
      },
      emailVerified: Boolean(user.emailVerifiedAt),
      recentVideos: recentVideos.map((video) => serializeVideo(video)),
      scoreTrend: recentAnalyses
        .slice()
        .reverse()
        .map((analysis) => ({
          videoId: analysis.videoId,
          score: analysis.fakeScore,
          verdict: analysis.verdict,
          date: analysis.createdAt.toISOString(),
        })),
    };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (!(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Password is incorrect");
    }

    await this.audit.record({
      actorId: userId,
      action: "account.deleted",
      targetType: "user",
      targetId: userId,
    });

    await Promise.all([
      this.storage.deletePrefix(`videos/${userId}/`),
      this.storage.deletePrefix(`thumbnails/${userId}/`),
    ]);
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: "Account and associated media deleted" };
  }
}
