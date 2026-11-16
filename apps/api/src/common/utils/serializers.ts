import type { Analysis, User, Video } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function serializeVideo(
  video: Video & { analysis?: Analysis | null },
  options: { videoUrl?: string; thumbnailUrls?: string[] } = {},
) {
  return {
    id: video.id,
    originalName: video.originalName,
    mimeType: video.mimeType,
    sizeBytes: Number(video.sizeBytes),
    durationSeconds: video.durationSeconds,
    width: video.width,
    height: video.height,
    status: video.status,
    error: video.error,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    expiresAt: video.expiresAt.toISOString(),
    videoUrl: options.videoUrl ?? null,
    analysis: video.analysis ? serializeAnalysis(video.analysis, options.thumbnailUrls) : null,
  };
}

export function serializeAnalysis(analysis: Analysis, thumbnailUrls?: string[]) {
  return {
    id: analysis.id,
    videoId: analysis.videoId,
    modelVersion: analysis.modelVersion,
    modelName: analysis.modelName,
    backend: analysis.backend,
    fakeScore: analysis.fakeScore,
    fakeProbability: analysis.fakeProbability,
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    temporalScore: analysis.temporalScore,
    audioScore: analysis.audioScore,
    framesAnalyzed: analysis.framesAnalyzed,
    facesDetected: analysis.facesDetected,
    frameScores: analysis.frameScores,
    flaggedFrames: (analysis.flaggedFrames as unknown[]) ?? [],
    details: analysis.details,
    createdAt: analysis.createdAt.toISOString(),
    thumbnailUrls: thumbnailUrls ?? [],
  };
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
