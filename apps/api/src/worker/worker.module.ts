import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configuration } from "../config/configuration";
import { MlModule } from "../ml/ml.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { StorageModule } from "../storage/storage.module";
import { AnalysisProcessor } from "./analysis.processor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ["../../.env", ".env"],
      load: [configuration],
    }),
    MlModule,
    PrismaModule,
    StorageModule,
    QueueModule,
  ],
  providers: [AnalysisProcessor],
})
export class WorkerModule {}
