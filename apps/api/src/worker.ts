import "./config/load-env";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { AppConfiguration } from "./config/configuration";
import { validateEnvironment } from "./config/configuration";
import { WorkerModule } from "./worker/worker.module";

async function bootstrap(): Promise<void> {
  validateEnvironment();
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfiguration, true>);
  const logger = new Logger("Worker");

  logger.log(
    `Analysis worker started (queue prefix=${config.get("queuePrefix", { infer: true })}, concurrency=${config.get("workerConcurrency", { infer: true })})`,
  );

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}; draining worker`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal worker startup error", error);
  process.exit(1);
});
