import type { Analysis, User, Video } from "@prisma/client";
import {
  isAdmin,
  serializeAnalysis,
  serializeVideo,
  toSafeUser,
} from "./serializers";

const createdAt = new Date("2026-02-03T10:11:12.000Z");

const user = {
  id: "user_1",
  email: "analyst@example.com",
  name: "Analyst",
  passwordHash: "$argon2id$secret",
  role: "USER",
  plan: "PRO",
  emailVerifiedAt: createdAt,
  bannedAt: null,
  lastLoginAt: null,
  createdAt,
  updatedAt: createdAt,
} satisfies User;

const analysis = {
  id: "analysis_1",
  videoId: "video_1",
  modelVersion: "1.0.0",
  modelName: "Test model",
  backend: "MOCK",
  fakeScore: 72,
  fakeProbability: 0.72,
  verdict: "LIKELY_FAKE",
  confidence: 0.82,
  temporalScore: 0.11,
  audioScore: null,
  framesAnalyzed: 12,
  facesDetected: 9,
  frameScores: [{ index: 0, score: 0.2 }],
  flaggedFrames: [{ key: "thumbnails/u/v/1.jpg", score: 0.9 }],
  details: { mock: true },
  createdAt,
} satisfies Analysis;

const video = {
  id: "video_1",
  userId: user.id,
  storageKey: "videos/u/2026/02/clip.mp4",
  originalName: "clip.mp4",
  mimeType: "video/mp4",
  sizeBytes: BigInt(1_234_567),
  durationSeconds: 42.5,
  width: 1920,
  height: 1080,
  status: "DONE",
  error: null,
  jobId: "job_1",
  expiresAt: new Date("2026-03-05T10:11:12.000Z"),
  createdAt,
  updatedAt: createdAt,
  analysis,
} satisfies Video & { analysis: Analysis };

describe("serializers", () => {
  it("never exposes the password hash", () => {
    const safe = toSafeUser(user);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe.email).toBe(user.email);
    expect(safe.role).toBe("USER");
  });

  it("serializes bigint sizes as numbers and dates as ISO strings", () => {
    const result = serializeVideo(video, {
      videoUrl: "https://storage.example.com/signed",
      thumbnailUrls: ["https://storage.example.com/frame.jpg"],
    });

    expect(result.sizeBytes).toBe(1_234_567);
    expect(result.createdAt).toBe("2026-02-03T10:11:12.000Z");
    expect(result.videoUrl).toBe("https://storage.example.com/signed");
    expect(result.analysis?.thumbnailUrls).toEqual([
      "https://storage.example.com/frame.jpg",
    ]);
    expect(result.analysis?.flaggedFrames).toHaveLength(1);
  });

  it("handles videos that have not been analyzed", () => {
    const result = serializeVideo({ ...video, analysis: null, status: "QUEUED" });
    expect(result.analysis).toBeNull();
    expect(result.videoUrl).toBeNull();
    expect(result.status).toBe("QUEUED");
  });

  it("defaults missing evidence arrays safely", () => {
    const result = serializeAnalysis({ ...analysis, flaggedFrames: null });
    expect(result.flaggedFrames).toEqual([]);
    expect(result.thumbnailUrls).toEqual([]);
    expect(result.createdAt).toBe("2026-02-03T10:11:12.000Z");
  });

  it("recognises both administrative roles", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("SUPER_ADMIN")).toBe(true);
    expect(isAdmin("USER")).toBe(false);
    expect(isAdmin("admin")).toBe(false);
  });
});
