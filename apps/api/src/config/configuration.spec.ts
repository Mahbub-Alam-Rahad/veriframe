import { validateEnvironment } from "./configuration";

const baseEnv = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
};

describe("environment validation", () => {
  it("accepts a development configuration", () => {
    expect(() => validateEnvironment(baseEnv)).not.toThrow();
  });

  it("rejects missing database and redis URLs", () => {
    expect(() => validateEnvironment({ NODE_ENV: "development" })).toThrow(
      /DATABASE_URL/,
    );
    expect(() =>
      validateEnvironment({ NODE_ENV: "development", DATABASE_URL: baseEnv.DATABASE_URL }),
    ).toThrow(/REDIS_URL/);
  });

  it("requires strong secrets in production", () => {
    expect(() =>
      validateEnvironment({ ...baseEnv, NODE_ENV: "production" }),
    ).toThrow(/JWT_ACCESS_SECRET/);

    expect(() =>
      validateEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "a".repeat(40),
        JWT_REFRESH_SECRET: "b".repeat(40),
        ML_INTERNAL_TOKEN: "c".repeat(32),
        S3_ACCESS_KEY: "key",
        S3_SECRET_KEY: "secret",
      }),
    ).not.toThrow();
  });

  it("rejects placeholder secrets in production", () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "change-me-access-secret-at-least-32-characters",
        JWT_REFRESH_SECRET: "change-me-refresh-secret-at-least-32-characters",
        ML_INTERNAL_TOKEN: "change-me-internal-token-at-least-32-characters",
        S3_ACCESS_KEY: "minioadmin",
        S3_SECRET_KEY: "change-me-minio-secret",
      }),
    ).toThrow(/non-placeholder/);
  });

  it("rejects the bootstrap password placeholder in production", () => {
    expect(() =>
      validateEnvironment({
        ...baseEnv,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "a".repeat(40),
        JWT_REFRESH_SECRET: "b".repeat(40),
        ML_INTERNAL_TOKEN: "c".repeat(32),
        S3_ACCESS_KEY: "key",
        S3_SECRET_KEY: "secret",
        ADMIN_PASSWORD: "ChangeMe-123456!",
      }),
    ).toThrow(/ADMIN_PASSWORD/);
  });
});
