import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { sha256 } from "../common/utils/crypto";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import { PrismaService } from "../prisma/prisma.service";

export interface ApiKeyRequest extends Request {
  user?: AuthenticatedUser;
  apiKeyId?: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const header = request.header("x-api-key") ?? "";
    const bearer = request.header("authorization");
    const key = header || (bearer?.startsWith("Bearer vf_") ? bearer.slice(7) : "");

    if (!key || !key.startsWith("vf_")) {
      throw new UnauthorizedException("Provide a valid API key in the x-api-key header");
    }

    const record = await this.prisma.apiKey.findUnique({
      where: { keyHash: sha256(key) },
      include: { user: true },
    });

    if (!record || record.revokedAt) {
      throw new UnauthorizedException("API key is invalid or revoked");
    }
    if (record.user.bannedAt) throw new UnauthorizedException("Account is suspended");
    if (!record.user.emailVerifiedAt) {
      throw new UnauthorizedException("Verify the account email before using the API");
    }

    if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 300_000) {
      await this.prisma.apiKey
        .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    request.user = {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      role: record.user.role,
      plan: record.user.plan,
      emailVerifiedAt: record.user.emailVerifiedAt,
    };
    request.apiKeyId = record.id;
    return true;
  }
}
