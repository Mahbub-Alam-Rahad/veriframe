import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AnalysesModule } from "./analyses/analyses.module";
import { ApiKeysModule } from "./api-keys/api-keys.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import { configuration } from "./config/configuration";
import { ContactModule } from "./contact/contact.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { MlModule } from "./ml/ml.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicApiModule } from "./public-api/public-api.module";
import { QueueModule } from "./queue/queue.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";
import { VideosModule } from "./videos/videos.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ["../../.env", ".env"],
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    MailModule,
    AuditModule,
    QueueModule,
    MlModule,
    AuthModule,
    UsersModule,
    VideosModule,
    AnalysesModule,
    ApiKeysModule,
    ContactModule,
    PublicApiModule,
    AdminModule,
    HealthModule,
    MaintenanceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
