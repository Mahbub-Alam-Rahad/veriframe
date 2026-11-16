import "./config/load-env";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import type { AppConfiguration } from "./config/configuration";
import { validateEnvironment } from "./config/configuration";

async function bootstrap(): Promise<void> {
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfiguration, true>);
  const logger = new Logger("Bootstrap");
  const isProduction = config.get("isProduction", { infer: true });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "no-referrer" },
    }),
  );
  app.use(cookieParser());
  app.useBodyParser("json", { limit: "2mb" });
  app.useBodyParser("urlencoded", { limit: "2mb", extended: true });
  app.setGlobalPrefix("api/v1");
  app.set("trust proxy", config.get("trustProxy", { infer: true }));
  app.enableCors({
    origin: config.get("webOrigin", { infer: true }),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id", "Content-Disposition"],
    maxAge: 600,
  });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Cookie-authenticated unsafe requests must originate from an allowed web origin.
  const allowedOrigins = new Set(config.get("webOrigin", { infer: true }));
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
    const origin = request.header("origin");
    const apiKey = request.header("x-api-key");
    if (origin && !apiKey && !allowedOrigins.has(origin)) {
      response.status(403).json({
        statusCode: 403,
        error: "Forbidden",
        message: "Request origin is not allowed",
      });
      return;
    }
    next();
  });

  if (config.get("swaggerEnabled", { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("VeriFrame API")
        .setDescription(
          "Deepfake detection platform API. Scores are probabilistic and must not be presented as proof.",
        )
        .setVersion("1.0.0")
        .addCookieAuth("vf_access", { type: "apiKey", in: "cookie" })
        .addApiKey({ type: "apiKey", in: "header", name: "x-api-key" }, "api-key")
        .addServer("/api/v1")
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log("OpenAPI docs available at /api/docs");
  }

  const port = config.get("port", { infer: true });
  await app.listen(port, "0.0.0.0");
  logger.log(
    `API listening on :${port} (${isProduction ? "production" : config.get("nodeEnv", { infer: true })})`,
  );
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", error);
  process.exit(1);
});
