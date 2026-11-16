import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { serializeAnalysis, serializeVideo } from "../common/utils/serializers";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { ListAnalysesQueryDto } from "./dto/analyses.dto";
import { ReportService } from "./report.service";

@Injectable()
export class AnalysesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly report: ReportService,
  ) {}

  async list(userId: string, query: ListAnalysesQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.AnalysisWhereInput = {
      video: { userId },
      ...(query.verdict ? { verdict: query.verdict } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.analysis.count({ where }),
      this.prisma.analysis.findMany({
        where,
        include: { video: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: items.map((analysis) => ({
        ...serializeAnalysis(analysis),
        video: {
          id: analysis.video.id,
          originalName: analysis.video.originalName,
          durationSeconds: analysis.video.durationSeconds,
          createdAt: analysis.video.createdAt.toISOString(),
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async get(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, video: { userId } },
      include: { video: true },
    });
    if (!analysis) throw new NotFoundException("Analysis not found");

    const videoUrl = await this.storage.presignGet(analysis.video.storageKey, 3600).catch(() => null);
    const frames = (analysis.flaggedFrames as Array<{ key?: string }>) ?? [];
    const urls = await Promise.all(
      frames.map((frame) =>
        frame.key ? this.storage.presignGet(frame.key, 3600).catch(() => null) : null,
      ),
    );

    return {
      analysis: {
        ...serializeAnalysis(analysis),
        flaggedFrames: frames.map((frame, index) => ({ ...frame, url: urls[index] })),
      },
      video: serializeVideo(analysis.video, { videoUrl: videoUrl ?? undefined }),
    };
  }

  async reportPdf(userId: string, analysisId: string): Promise<{ buffer: Buffer; filename: string }> {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, video: { userId } },
      include: { video: true },
    });
    if (!analysis) throw new NotFoundException("Analysis not found");
    const buffer = await this.report.build(analysis);
    const base = analysis.video.originalName.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_");
    return { buffer, filename: `veriframe-${base || analysis.id}.pdf` };
  }

  async reportForAdmin(analysisId: string): Promise<{ buffer: Buffer; filename: string }> {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId },
      include: { video: true },
    });
    if (!analysis) throw new NotFoundException("Analysis not found");
    const buffer = await this.report.build(analysis);
    return { buffer, filename: `veriframe-${analysis.id}.pdf` };
  }
}
