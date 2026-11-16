import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Plan } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { createApiKey } from "../common/utils/crypto";
import { getPlan } from "../config/plans";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateApiKeyDto } from "./dto/api-keys.dto";

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    return {
      items: keys.map((key) => ({
        ...key,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        revokedAt: key.revokedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      })),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateApiKeyDto) {
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException("Verify your email before creating API keys");
    }
    if (user.plan === Plan.FREE) {
      throw new ForbiddenException("API access is available on the Pro and Enterprise plans");
    }

    const plan = getPlan(user.plan as Plan);
    const active = await this.prisma.apiKey.count({
      where: { userId: user.id, revokedAt: null },
    });
    if (active >= plan.maxApiKeys) {
      throw new BadRequestException(
        `The ${plan.name} plan allows ${plan.maxApiKeys} active API keys. Revoke one first.`,
      );
    }

    const generated = createApiKey();
    const record = await this.prisma.apiKey.create({
      data: {
        userId: user.id,
        name: dto.name.trim(),
        prefix: generated.prefix,
        keyHash: generated.hash,
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: "api_key.created",
      targetType: "api_key",
      targetId: record.id,
      metadata: { prefix: generated.prefix },
    });

    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt.toISOString(),
      key: generated.key,
      warning: "Copy this key now. It is stored as a hash and cannot be shown again.",
    };
  }

  async revoke(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!key) throw new NotFoundException("API key not found");
    if (key.revokedAt) return { message: "API key is already revoked" };

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      actorId: userId,
      action: "api_key.revoked",
      targetType: "api_key",
      targetId: key.id,
      metadata: { prefix: key.prefix },
    });
    return { message: "API key revoked" };
  }
}
