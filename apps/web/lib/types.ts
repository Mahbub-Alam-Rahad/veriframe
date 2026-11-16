/**
 * Shared response types for the VeriFrame API.
 * Dates are serialized by NestJS as ISO-8601 strings.
 */

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
export type PlanId = "FREE" | "PRO" | "ENTERPRISE";
export type VideoStatus = "UPLOADED" | "QUEUED" | "PROCESSING" | "DONE" | "FAILED";
export type Verdict = "LIKELY_REAL" | "UNCERTAIN" | "LIKELY_FAKE";
export type ContactStatus = "NEW" | "READ" | "IN_PROGRESS" | "RESOLVED";
export type ModelBackend = "HF" | "MOCK";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: PlanId;
  emailVerifiedAt: string | null;
  bannedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: PlanId;
  emailVerifiedAt: string | null;
  sessionId?: string;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthly: number;
  monthlyAnalyses: number;
  maxUploadBytes: number;
  maxVideoSeconds: number;
  maxApiKeys: number;
  retentionDays: number;
  features: string[];
}

export interface PlanLimits {
  monthlyAnalyses: number;
  maxUploadBytes: number;
  maxVideoSeconds: number;
  maxApiKeys: number;
  retentionDays: number;
}

export interface PlanUsage {
  month: string;
  analyses: number;
  bytes: number;
  remaining: number;
}

export interface MeResponse {
  user: User;
  plan: PlanDefinition;
  limits: PlanLimits;
  usage: PlanUsage;
  counts: { apiKeys: number; videos: number };
}

export type SessionResponse = { user: SessionUser };

export interface FrameScore {
  index: number;
  timestampSeconds: number;
  score: number;
  faceDetected: boolean;
  box: [number, number, number, number] | null;
}

export interface FlaggedFrame extends FrameScore {
  key?: string;
  url?: string | null;
  rank?: number;
}

export interface AnalysisDetails {
  backend?: string;
  modelId?: string;
  mock?: boolean;
  device?: string;
  sampleFps?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  processingMs?: number;
  calibrationTemperature?: number;
  aggregation?: string;
  visualScore?: number;
  disclaimer?: string;
  warnings?: string[];
  [key: string]: unknown;
}

export interface Analysis {
  id: string;
  videoId: string;
  modelVersion: string;
  modelName: string;
  backend: string;
  fakeScore: number;
  fakeProbability: number;
  verdict: Verdict;
  confidence: number;
  temporalScore: number | null;
  audioScore: number | null;
  framesAnalyzed: number;
  facesDetected: number;
  frameScores: FrameScore[] | null;
  flaggedFrames: FlaggedFrame[];
  details: AnalysisDetails | null;
  createdAt: string;
  thumbnailUrls: string[];
}

export interface Video {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  status: VideoStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  videoUrl: string | null;
  analysis: Analysis | null;
}

export interface AnalysisListItem extends Analysis {
  video: {
    id: string;
    originalName: string;
    durationSeconds: number | null;
    createdAt: string;
  };
}

export interface VideoListResponse {
  items: Video[];
  pagination: Pagination;
}

export interface AnalysisListResponse {
  items: AnalysisListItem[];
  pagination: Pagination;
}

export interface AnalysisDetailResponse {
  analysis: Analysis;
  video: Video;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ScoreTrendPoint {
  videoId: string;
  score: number;
  verdict: Verdict;
  date: string;
}

export interface DashboardStats {
  counts: Record<VideoStatus, number>;
  totalVideos: number;
  totalAnalyses: number;
  averageScore: number | null;
  usage: { analyses: number; remaining: number; limit: number; month: string };
  emailVerified: boolean;
  recentVideos: Video[];
  scoreTrend: ScoreTrendPoint[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ApiKeyListResponse {
  items: ApiKey[];
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  key: string;
  warning: string;
}

export interface SessionInfo {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; email: string; name: string | null } | null;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  ip: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  backend: ModelBackend;
  modelId: string;
  calibrationTemperature: number;
  metrics: Record<string, unknown> | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  users: { total: number; verified: number; banned: number; newLast7Days: number };
  videos: { total: number; byStatus: Record<VideoStatus, number>; storageBytes: number };
  analyses: { total: number; averageScore: number | null; byVerdict: Partial<Record<Verdict, number>> };
  messages: { new: number };
  queue: { counts: Record<string, number>; oldestWaitingSeconds: number | null };
  activeModel: {
    id: string;
    name: string;
    version: string;
    backend: ModelBackend;
    modelId: string;
  } | null;
  recentFailed: Array<{
    id: string;
    originalName: string;
    error: string | null;
    updatedAt: string;
    user: { id: string; email: string };
  }>;
  signupsByDay: Array<{ date: string; count: number }>;
}

export interface AdminUser extends User {
  counts: { videos: number; apiKeys: number };
  usage: { analyses: number; bytes: number };
}

export interface AdminUserListResponse {
  items: AdminUser[];
  pagination: Pagination;
}

export interface AdminVideo extends Video {
  user: { id: string; email: string; name: string | null; plan: PlanId };
}

export interface AdminVideoListResponse {
  items: AdminVideo[];
  pagination: Pagination;
}

export interface AdminMessageListResponse {
  items: ContactMessage[];
  pagination: Pagination;
}

export interface AuditListResponse {
  items: AuditLogEntry[];
  pagination: Pagination;
}

export interface SystemHealth {
  status: "healthy" | "degraded";
  checks: {
    database: boolean;
    redis: boolean;
    ml: { ok: boolean; backend?: string; model?: string; detail?: string };
    storage: boolean;
  };
  queue: Record<string, number>;
  model: ModelVersion | null;
  modelVersions: number;
  runtime: {
    uptimeSeconds: number;
    memoryMb: number;
    nodeVersion: string;
    environment: string;
  };
}

export interface HealthResponse {
  status: "ok" | "degraded";
  checks: { database: boolean; redis: boolean; storage: boolean; ml: boolean };
  ml: { backend: string | null; model: string | null };
  timestamp: string;
}

export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  requestId?: string;
  timestamp?: string;
  path?: string;
}

export interface ContactResponse {
  message: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  devVerificationUrl?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  devResetUrl?: string;
}
