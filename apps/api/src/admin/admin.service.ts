import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContactStatus,
  Prisma,
  Role,
  VideoStatus,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { serializeVideo, toSafeUser } from "../common/utils/serializers";
import { currentMonth } from "../config/plans";
import { ContactService } from "../contact/contact.service";
import { MlService } from "../ml/ml.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";
import type {
  AdminPaginationQueryDto,
  CreateModelVersionDto,
  ListAdminUsersQueryDto,
  ListAdminVideosQueryDto,
  ListAuditQueryDto,
  ListMessagesQueryDto,
  UpdateAdminUserDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly ml: MlService,
    private readonly audit: AuditService,
    private readonly contact: ContactService,
  ) {}

  async stats() {
    const since = new Date(Date.now() - 7 * 86_400_000);

    const [
      totalUsers,
      verifiedUsers,
      bannedUsers,
      newUsers,
      videoGroups,
      videoTotals,
      storage,
      analysisCount,
      scoreAverage,
      verdictGroups,
      newMessages,
      queueCounts,
      oldestWaiting,
      activeModel,
      recentFailed,
      recentSignups,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      this.prisma.user.count({ where: { bannedAt: { not: null } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.video.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.video.count(),
      this.prisma.video.aggregate({ _sum: { sizeBytes: true } }),
      this.prisma.analysis.count(),
      this.prisma.analysis.aggregate({ _avg: { fakeScore: true } }),
      this.prisma.analysis.groupBy({ by: ["verdict"], _count: { _all: true } }),
      this.prisma.contactMessage.count({ where: { status: ContactStatus.NEW } }),
      this.queue.counts(),
      this.queue.oldestWaitingAgeSeconds(),
      this.prisma.modelVersion.findFirst({ where: { isActive: true } }),
      this.prisma.video.findMany({
        where: { status: VideoStatus.FAILED },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          originalName: true,
          error: true,
          updatedAt: true,
          user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const signupsByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        count: recentSignups.filter((user) => user.createdAt.toISOString().slice(0, 10) === key)
          .length,
      };
    });

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        banned: bannedUsers,
        newLast7Days: newUsers,
      },
      videos: {
        total: videoTotals,
        byStatus: Object.fromEntries(
          Object.values(VideoStatus).map((status) => [
            status,
            videoGroups.find((group) => group.status === status)?._count._all ?? 0,
          ]),
        ),
        storageBytes: Number(storage._sum.sizeBytes ?? 0),
      },
      analyses: {
        total: analysisCount,
        averageScore:
          scoreAverage._avg.fakeScore === null ? null : Math.round(scoreAverage._avg.fakeScore),
        byVerdict: Object.fromEntries(
          verdictGroups.map((group) => [group.verdict, group._count._all]),
        ),
      },
      messages: { new: newMessages },
      queue: { counts: queueCounts, oldestWaitingSeconds: oldestWaiting },
      activeModel: activeModel
        ? {
            id: activeModel.id,
            name: activeModel.name,
            version: activeModel.version,
            backend: activeModel.backend,
            modelId: activeModel.modelId,
          }
        : null,
      recentFailed: recentFailed.map((video) => ({
        ...video,
        updatedAt: video.updatedAt.toISOString(),
      })),
      signupsByDay,
    };
  }

  async listUsers(query: ListAdminUsersQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.plan ? { plan: query.plan } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              { name: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { videos: true, apiKeys: true } },
          usage: { where: { month: currentMonth() }, take: 1 },
        },
      }),
    ]);

    return {
      items: users.map((user) => ({
        ...toSafeUser(user),
        counts: user._count,
        usage: user.usage[0]
          ? { analyses: user.usage[0].analyses, bytes: Number(user.usage[0].bytes) }
          : { analyses: 0, bytes: 0 },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async updateUser(actor: AuthenticatedUser, userId: string, dto: UpdateAdminUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException("User not found");
    if (target.id === actor.id && (dto.role || dto.banned !== undefined)) {
      throw new ForbiddenException("You cannot change your own role or ban status");
    }
    if (dto.role && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Only a super admin can change roles");
    }
    if (
      dto.banned !== undefined &&
      target.role !== Role.USER &&
      actor.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException("Only a super admin can suspend admin accounts");
    }
    if (target.role === Role.SUPER_ADMIN && dto.role && dto.role !== Role.SUPER_ADMIN) {
      const superAdmins = await this.prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
      if (superAdmins <= 1) throw new BadRequestException("At least one super admin must remain");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.plan ? { plan: dto.plan } : {}),
        ...(dto.banned !== undefined ? { bannedAt: dto.banned ? new Date() : null } : {}),
      },
    });

    if (dto.banned === true) {
      await this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      actorId: actor.id,
      action: "admin.user_updated",
      targetType: "user",
      targetId: userId,
      metadata: {
        role: dto.role ?? null,
        plan: dto.plan ?? null,
        banned: dto.banned ?? null,
      },
    });

    return { user: toSafeUser(user) };
  }

  async listVideos(query: ListAdminVideosQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.VideoWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { originalName: { contains: query.search, mode: "insensitive" } },
              { user: { email: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, videos] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        include: {
          analysis: true,
          user: { select: { id: true, email: true, name: true, plan: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: videos.map((video) => ({
        ...serializeVideo(video),
        user: video.user,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async retryVideo(actor: AuthenticatedUser, videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { user: { select: { plan: true } } },
    });
    if (!video) throw new NotFoundException("Video not found");
    if (video.status === VideoStatus.PROCESSING) {
      throw new BadRequestException("This video is already processing");
    }

    const jobId = await this.queue.enqueue(
      { videoId: video.id, userId: video.userId, storageKey: video.storageKey },
      video.user.plan,
    );
    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.QUEUED, error: null, jobId },
    });

    await this.audit.record({
      actorId: actor.id,
      action: "admin.video_retried",
      targetType: "video",
      targetId: video.id,
    });

    return { message: "Analysis queued", jobId };
  }

  async deleteVideo(actor: AuthenticatedUser, videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException("Video not found");

    await this.prisma.video.delete({ where: { id: video.id } });
    await Promise.all([
      this.storage.deleteObject(video.storageKey).catch(() => undefined),
      this.storage.deletePrefix(`thumbnails/${video.userId}/${video.id}/`).catch(() => undefined),
    ]);

    await this.audit.record({
      actorId: actor.id,
      action: "admin.video_deleted",
      targetType: "video",
      targetId: video.id,
      metadata: { ownerId: video.userId, name: video.originalName },
    });
    return { message: "Video deleted" };
  }

  async listMessages(query: ListMessagesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.ContactMessageWhereInput = query.status ? { status: query.status } : {};
    const [total, items] = await Promise.all([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async updateMessage(actor: AuthenticatedUser, id: string, status: ContactStatus) {
    const result = await this.contact.updateStatus(id, status);
    await this.audit.record({
      actorId: actor.id,
      action: "admin.message_updated",
      targetType: "contact_message",
      targetId: id,
      metadata: { status },
    });
    return result;
  }

  async listModels() {
    const models = await this.prisma.modelVersion.findMany({ orderBy: { createdAt: "desc" } });
    return { items: models };
  }

  async createModel(actor: AuthenticatedUser, dto: CreateModelVersionDto) {
    const model = await this.prisma.$transaction(async (tx) => {
      if (dto.activate) {
        await tx.modelVersion.updateMany({ data: { isActive: false } });
      }
      return tx.modelVersion.create({
        data: {
          name: dto.name,
          version: dto.version,
          backend: dto.backend,
          modelId: dto.modelId,
          calibrationTemperature: dto.calibrationTemperature ?? 1,
          metrics: dto.metrics,
          notes: dto.notes,
          isActive: dto.activate ?? false,
        },
      });
    });

    await this.audit.record({
      actorId: actor.id,
      action: "admin.model_created",
      targetType: "model_version",
      targetId: model.id,
      metadata: { modelId: dto.modelId, backend: dto.backend, active: dto.activate ?? false },
    });
    return { model };
  }

  async activateModel(actor: AuthenticatedUser, id: string) {
    const model = await this.prisma.modelVersion.findUnique({ where: { id } });
    if (!model) throw new NotFoundException("Model version not found");

    await this.prisma.$transaction([
      this.prisma.modelVersion.updateMany({ data: { isActive: false } }),
      this.prisma.modelVersion.update({ where: { id }, data: { isActive: true } }),
    ]);

    await this.audit.record({
      actorId: actor.id,
      action: "admin.model_activated",
      targetType: "model_version",
      targetId: id,
      metadata: { modelId: model.modelId, version: model.version },
    });
    return { message: "Model activated", id };
  }

  async deleteModel(actor: AuthenticatedUser, id: string) {
    const model = await this.prisma.modelVersion.findUnique({ where: { id } });
    if (!model) throw new NotFoundException("Model version not found");
    if (model.isActive) throw new BadRequestException("Activate another model before deleting this one");

    await this.prisma.modelVersion.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      action: "admin.model_deleted",
      targetType: "model_version",
      targetId: id,
      metadata: { modelId: model.modelId, version: model.version },
    });
    return { message: "Model version deleted" };
  }

  async listAudit(query: ListAuditQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.AuditLogWhereInput = query.action
      ? { action: { contains: query.action, mode: "insensitive" } }
      : {};

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, email: true, name: true } } },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async system() {
    const [db, redis, ml, storage, queue, activeModel, versions] = await Promise.all([
      this.prisma
        .$queryRaw`SELECT 1 AS ok`
        .then(() => true)
        .catch(() => false),
      this.queue.healthCheck(),
      this.ml.health(),
      this.storage.healthCheck(),
      this.queue.counts(),
      this.prisma.modelVersion.findFirst({ where: { isActive: true } }),
      this.prisma.modelVersion.count(),
    ]);

    return {
      status: db && redis && ml.ok && storage ? "healthy" : "degraded",
      checks: { database: db, redis, ml, storage },
      queue,
      model: activeModel,
      modelVersions: versions,
      runtime: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV ?? "development",
      },
    };
  }
}
