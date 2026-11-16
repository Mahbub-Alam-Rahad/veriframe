import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { VideoStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron("0 3 * * *", { name: "retention-cleanup" })
  async cleanupExpiredMedia(): Promise<void> {
    const expired = await this.prisma.video.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true, userId: true, storageKey: true },
      take: 500,
    });

    for (const video of expired) {
      try {
        await Promise.all([
          this.storage.deleteObject(video.storageKey),
          this.storage.deletePrefix(`thumbnails/${video.userId}/${video.id}/`),
        ]);
        await this.prisma.video.delete({ where: { id: video.id } });
      } catch (error) {
        this.logger.error(
          `Retention cleanup failed for video ${video.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (expired.length > 0) {
      this.logger.log(`Retention cleanup removed ${expired.length} expired videos`);
    }
  }

  @Cron("30 3 * * *", { name: "session-cleanup" })
  async cleanupSessions(): Promise<void> {
    const [sessions, tokens] = await Promise.all([
      this.prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
      }),
      this.prisma.verificationToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }] },
      }),
    ]);
    if (sessions.count + tokens.count > 0) {
      this.logger.log(
        `Cleanup removed ${sessions.count} sessions and ${tokens.count} verification tokens`,
      );
    }
  }

  @Cron("45 3 * * *", { name: "stale-job-cleanup" })
  async markStaleJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 60_000);
    const result = await this.prisma.video.updateMany({
      where: { status: VideoStatus.PROCESSING, updatedAt: { lt: cutoff } },
      data: {
        status: VideoStatus.FAILED,
        error: "Analysis stalled and was marked failed. Retry from the dashboard.",
      },
    });
    if (result.count > 0) this.logger.warn(`Marked ${result.count} stalled analyses as failed`);
  }
}
