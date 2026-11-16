import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Prisma, VideoStatus } from "@prisma/client";
import { getPlan } from "../config/plans";
import { MlService } from "../ml/ml.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AnalysisJob } from "../queue/queue.service";
import { ANALYSIS_QUEUE } from "../queue/queue.module";

@Processor(ANALYSIS_QUEUE, { concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2) })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlService,
  ) {
    super();
  }

  async process(job: Job<AnalysisJob>): Promise<void> {
    const { videoId } = job.data;
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { user: { select: { id: true, plan: true } }, analysis: true },
    });

    if (!video) {
      this.logger.warn(`Video ${videoId} no longer exists; dropping job`);
      return;
    }
    if (video.analysis && video.status === VideoStatus.DONE) {
      this.logger.log(`Video ${videoId} is already analyzed; skipping duplicate job`);
      return;
    }

    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.PROCESSING, error: null },
    });

    try {
      const model =
        (await this.prisma.modelVersion.findFirst({ where: { isActive: true } })) ?? {
          name: "Environment default",
          version: "env",
          backend:
            (process.env.MODEL_BACKEND ?? "mock").toLowerCase() === "hf" ? "HF" : "MOCK",
          modelId: process.env.MODEL_ID ?? "dima806/deepfake_vs_real_image_detection",
          calibrationTemperature: Number(process.env.MODEL_CALIBRATION_TEMPERATURE ?? 1),
        };

      const plan = getPlan(video.user.plan);
      const sampleFps = Number(process.env.SAMPLE_FPS ?? 1);
      const maxFrames = Number(process.env.MAX_FRAMES ?? 120);
      const estimatedFrames = Math.ceil((video.durationSeconds ?? plan.maxVideoSeconds) * sampleFps);
      const frames = Math.max(1, Math.min(maxFrames, estimatedFrames));

      const result = await this.ml.analyze({
        videoKey: video.storageKey,
        bucket: process.env.S3_BUCKET ?? "deepfake",
        videoId: video.id,
        userId: video.userId,
        modelId: model.modelId,
        backend: model.backend === "HF" ? "hf" : "mock",
        calibrationTemperature: model.calibrationTemperature,
        sampleFps,
        maxFrames: frames,
        maxDurationSeconds: Math.min(plan.maxVideoSeconds, Number(process.env.MAX_VIDEO_SECONDS ?? 600)),
      });

      const payload = {
        modelVersion: model.version,
        modelName: model.name,
        backend: model.backend,
        fakeScore: result.fakeScore,
        fakeProbability: result.fakeProbability,
        verdict: result.verdict,
        confidence: result.confidence,
        temporalScore: result.temporalScore,
        audioScore: null,
        framesAnalyzed: result.framesAnalyzed,
        facesDetected: result.facesDetected,
        frameScores: toJson(result.frameScores),
        flaggedFrames: toJson(result.flaggedFrames),
        details: toJson(result.details),
      };

      await this.prisma.$transaction([
        this.prisma.video.update({
          where: { id: video.id },
          data: { status: VideoStatus.DONE, error: null },
        }),
        this.prisma.analysis.upsert({
          where: { videoId: video.id },
          create: { videoId: video.id, ...payload },
          update: payload,
        }),
      ]);

      this.logger.log(
        `Analyzed ${video.id}: score=${result.fakeScore} verdict=${result.verdict} frames=${result.framesAnalyzed} backend=${result.details.backend}`,
      );
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const isFinal = job.attemptsMade + 1 >= attempts;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Analysis ${video.id} failed (attempt ${job.attemptsMade + 1}/${attempts}): ${message}`,
      );

      await this.prisma.video
        .update({
          where: { id: video.id },
          data: {
            status: isFinal ? VideoStatus.FAILED : VideoStatus.QUEUED,
            error: isFinal
              ? "Analysis failed. Check the video format or retry later."
              : "Analysis attempt failed; retrying automatically.",
          },
        })
        .catch(() => undefined);

      throw error;
    }
  }
}

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
