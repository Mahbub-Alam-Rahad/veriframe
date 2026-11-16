import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { AppConfiguration } from "../config/configuration";
import { MlService } from "./ml.service";

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfiguration, true>) => ({
        timeout: config.get("ml.timeoutMs", { infer: true }),
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
      }),
    }),
  ],
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
