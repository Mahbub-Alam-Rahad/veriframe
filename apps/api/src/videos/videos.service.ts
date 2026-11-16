import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Plan, Prisma, Video, VideoStatus } from "@prisma/client";
import { fromFile } from "file-type";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { sanitizeFilename } from "../common/utils/crypto";
import { serializeAnalysis, serializeVideo } from "../common/utils/serializers";
import { probeVideo } from "../common/utils/video-probe";
import type { AppConfiguration } from "../config/configuration";
import {
  currentMonth,
  effectiveRetentionDays,
  effectiveUploadLimit,
  getPlan,
} from "../config/plans";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";
import type { ListVideosQueryDto } from "./dto/videos.dto";

const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "mkv", "m4v"]);

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async upload(user: AuthenticatedUser, file: Express.Multer.File) {
    if (!file) throw new BadRequestException("A video file is required");
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        "Verify your email address before uploading videos. Check your inbox or request a new link.",
      );
    }

    const plan = getPlan(user.plan as Plan);
    const absoluteMaxBytes = this.config.get("maxUploadBytes", { infer: true });
    const maxBytes = effectiveUploadLimit(plan.id, absoluteMaxBytes);
    const maxSeconds = Math.min(
      plan.maxVideoSeconds,
      this.config.get("maxVideoSeconds", { infer: true }),
    );

    try {
      const fileStat = await stat(file.path);
      if (fileStat.size <= 0) throw new BadRequestException("The uploaded file is empty");
      if (fileStat.size > maxBytes) {
        throw new BadRequestException(
          `File is too large for the ${plan.name} plan. Maximum is ${Math.round(maxBytes / 1024 / 1024)} MB.`,
        );
      }

      const detected = await fromFile(file.path);
      if (!detected || !ALLOWED_VIDEO_EXTENSIONS.has(detected.ext)) {
        throw new BadRequestException("Only MP4, MOV, WebM and MKV video files are accepted");
      }

      const metadata = await probeVideo(file.path);
      if (metadata.durationSeconds > maxSeconds + 0.5) {
        throw new BadRequestException(
          `Video exceeds the ${plan.name} plan limit of ${maxSeconds} seconds.`,
        );
      }

      const month = currentMonth();
      const usage = await this.prisma.usageRecord.findUnique({
        where: { userId_month: { userId: user.id, month } },
      });
      if ((usage?.analyses ?? 0) >= plan.monthlyAnalyses) {
        throw new ForbiddenException(
          `Monthly analysis limit reached for the ${plan.name} plan (${plan.monthlyAnalyses}).`,
        );
      }

      const detectedMime =
        detected.mime === "video/x-matroska" ? "video/webm" : detected.mime || file.mimetype;
      const storageKey = this.storage.buildVideoKey(user.id, file.originalname);
      await this.storage.putObject({
        key: storageKey,
        body: createReadStream(file.path),
        contentType: detectedMime,
        contentLength: fileStat.size,
        metadata: { userId: user.id, originalname: encodeURIComponent(sanitizeFilename(file.originalname)) },
      });

      const retentionDays = effectiveRetentionDays(
        plan.id,
        this.config.get("retentionDays", { infer: true }),
      );

      let video: Video;
      try {
        video = await this.prisma.$transaction(
          async (tx) => {
            const reserved = await tx.usageRecord.upsert({
              where: { userId_month: { userId: user.id, month } },
              create: {
                userId: user.id,
                month,
                analyses: 1,
                bytes: BigInt(fileStat.size),
              },
              update: {
                analyses: { increment: 1 },
                bytes: { increment: BigInt(fileStat.size) },
              },
            });

            if (reserved.analyses > plan.monthlyAnalyses) {
              throw new ForbiddenException(
                `Monthly analysis limit reached for the ${plan.name} plan (${plan.monthlyAnalyses}).`,
              );
            }

            return tx.video.create({
              data: {
                userId: user.id,
                storageKey,
                originalName: sanitizeFilename(file.originalname),
                mimeType: detectedMime,
                sizeBytes: BigInt(fileStat.size),
                durationSeconds: metadata.durationSeconds,
                width: metadata.width,
                height: metadata.height,
                status: VideoStatus.QUEUED,
                expiresAt: new Date(Date.now() + retentionDays * 86_400_000),
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        await this.storage.deleteObject(storageKey).catch(() => undefined);
        throw error;
      }

      try {
        const jobId = await this.queue.enqueue(
          { videoId: video.id, userId: user.id, storageKey },
          plan.id,
        );
        video = await this.prisma.video.update({ where: { id: video.id }, data: { jobId } });
      } catch (error) {
        this.logger.error(
          `Failed to enqueue video ${video.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.prisma.video.update({
          where: { id: video.id },
          data: { status: VideoStatus.FAILED, error: "Analysis queue is unavailable" },
        });
        throw new ServiceUnavailableException("Analysis queue is unavailable; please retry shortly");
      }

      await this.audit.record({
        actorId: user.id,
        action: "video.uploaded",
        targetType: "video",
        targetId: video.id,
        metadata: {
          sizeBytes: Number(video.sizeBytes),
          durationSeconds: metadata.durationSeconds,
        },
      });

      return serializeVideo(video);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async list(userId: string, query: ListVideosQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));

    const where: Prisma.VideoWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { originalName: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };

    const [total, videos] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        include: { analysis: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: videos.map((video) => serializeVideo(video)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(userId: string, videoId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, userId },
      include: { analysis: true },
    });
    if (!video) throw new NotFoundException("Video not found");

    const videoUrl =
      video.status === VideoStatus.DONE || video.status === VideoStatus.PROCESSING
        ? await this.storage.presignGet(video.storageKey, 3600)
        : null;

    const result = serializeVideo(video, { videoUrl: videoUrl ?? undefined });

    if (video.analysis) {
      const frames = (video.analysis.flaggedFrames as Array<{ key?: string }>) ?? [];
      const urls = await Promise.all(
        frames.map((frame) =>
          frame.key ? this.storage.presignGet(frame.key, 3600).catch(() => null) : null,
        ),
      );
      result.analysis = {
        ...serializeAnalysis(video.analysis),
        flaggedFrames: frames.map((frame, index) => ({ ...frame, url: urls[index] })),
      };
    }

    return result;
  }

  async delete(userId: string, videoId: string) {
    const video = await this.prisma.video.findFirst({ where: { id: videoId, userId } });
    if (!video) throw new NotFoundException("Video not found");

    await this.prisma.video.delete({ where: { id: video.id } });
    await Promise.all([
      this.storage.deleteObject(video.storageKey).catch(() => undefined),
      this.storage.deletePrefix(`thumbnails/${userId}/${video.id}/`).catch(() => undefined),
    ]);

    await this.audit.record({
      actorId: userId,
      action: "video.deleted",
      targetType: "video",
      targetId: video.id,
    });

    return { message: "Video and analysis deleted" };
  }

  async retry(userId: string, videoId: string) {
    const video = await this.prisma.video.findFirst({ where: { id: videoId, userId } });
    if (!video) throw new NotFoundException("Video not found");
    if (video.status !== VideoStatus.FAILED) {
      throw new BadRequestException("Only failed analyses can be retried");
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (!owner) throw new NotFoundException("User not found");

    const jobId = await this.queue.enqueue(
      { videoId: video.id, userId, storageKey: video.storageKey },
      owner.plan,
    );
    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.QUEUED, error: null, jobId },
    });
    return { message: "Analysis queued again", jobId };
  }
}
