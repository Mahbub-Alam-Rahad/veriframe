import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/auth.decorators";
import { MlService } from "../ml/ml.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { StorageService } from "../storage/storage.service";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly storage: StorageService,
    private readonly ml: MlService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Liveness and dependency readiness" })
  async health() {
    const [database, redis, storageOk, ml] = await Promise.all([
      this.prisma
        .$queryRaw`SELECT 1 AS ok`
        .then(() => true)
        .catch(() => false),
      this.queue.healthCheck(),
      this.storage.healthCheck(),
      this.ml.health(),
    ]);

    const ok = database && redis;
    return {
      status: ok ? "ok" : "degraded",
      checks: {
        database,
        redis,
        storage: storageOk,
        ml: ml.ok,
      },
      ml: {
        backend: ml.backend ?? null,
        model: ml.model ?? null,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
