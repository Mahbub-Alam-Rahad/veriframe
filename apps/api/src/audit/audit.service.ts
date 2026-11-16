import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditInput {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId,
          ip: input.ip,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      // Audit logging must never break the business operation, but it must be loud.
      this.logger.error(
        `Failed to write audit log for ${input.action}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
