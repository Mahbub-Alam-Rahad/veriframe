import { z } from "zod";

const bool = (value: string | undefined, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const int = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface AppConfiguration {
  nodeEnv: string;
  isProduction: boolean;
  appName: string;
  port: number;
  webOrigin: string[];
  publicWebUrl: string;
  databaseUrl: string;
  redisUrl: string;
  queuePrefix: string;
  workerConcurrency: number;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  cookies: {
    domain: string | undefined;
    secure: boolean;
    accessName: string;
    refreshName: string;
  };
  storage: {
    endpoint: string;
    publicEndpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    forcePathStyle: boolean;
  };
  ml: {
    url: string;
    token: string;
    timeoutMs: number;
  };
  mail: {
    host: string | undefined;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
    adminEmail: string;
  };
  exposeDevTokens: boolean;
  retentionDays: number;
  maxUploadBytes: number;
  maxVideoSeconds: number;
  trustProxy: number;
  swaggerEnabled: boolean;
  logLevel: string;
  uploadTmpDir: string;
}

export const configuration = (): AppConfiguration => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  appName: process.env.APP_NAME ?? "VeriFrame",
  port: int(process.env.API_PORT, 3001),
  webOrigin: (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  queuePrefix: process.env.QUEUE_PREFIX ?? "deepfake",
  workerConcurrency: int(process.env.WORKER_CONCURRENCY, 2),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? "development-access-secret-change-me-now",
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-me-now",
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL ?? "30d",
  },
  cookies: {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: bool(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production"),
    accessName: "vf_access",
    refreshName: "vf_refresh",
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    bucket: process.env.S3_BUCKET ?? "deepfake",
    forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
  },
  ml: {
    url: process.env.ML_SERVICE_URL ?? "http://localhost:8000",
    token: process.env.ML_INTERNAL_TOKEN ?? "development-internal-token-change-me",
    timeoutMs: int(process.env.ML_TIMEOUT_MS, 900_000),
  },
  mail: {
    host: process.env.SMTP_HOST || undefined,
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM ?? "VeriFrame <no-reply@example.com>",
    adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  },
  exposeDevTokens: bool(
    process.env.EXPOSE_DEV_TOKENS,
    process.env.NODE_ENV !== "production",
  ),
  retentionDays: int(process.env.RETENTION_DAYS, 30),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 2 * 1024 * 1024 * 1024),
  maxVideoSeconds: int(process.env.MAX_VIDEO_SECONDS, 600),
  trustProxy: int(process.env.TRUST_PROXY, 1),
  swaggerEnabled: bool(process.env.SWAGGER_ENABLED, process.env.NODE_ENV !== "production"),
  logLevel: process.env.LOG_LEVEL ?? "info",
  uploadTmpDir: process.env.UPLOAD_TMP_DIR ?? "/tmp/deepfake-uploads",
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  ML_INTERNAL_TOKEN: z.string().min(24).optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_SECRET_KEY: z.string().min(1).optional(),
});

/**
 * Validates configuration at boot. In production, weak/placeholder secrets are fatal
 * instead of silently falling back to development defaults.
 */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${details.join("\n")}`);
  }

  if (env.NODE_ENV === "production") {
    const required = [
      ["JWT_ACCESS_SECRET", 32],
      ["JWT_REFRESH_SECRET", 32],
      ["ML_INTERNAL_TOKEN", 24],
      ["S3_ACCESS_KEY", 1],
      ["S3_SECRET_KEY", 1],
    ] as const;

    for (const [key, min] of required) {
      const value = env[key];
      if (!value || value.length < min || value.includes("change-me")) {
        throw new Error(`${key} must be set to a strong non-placeholder value in production`);
      }
    }

    if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.includes("ChangeMe")) {
      throw new Error("ADMIN_PASSWORD must be changed before production deployment");
    }
  }
}
