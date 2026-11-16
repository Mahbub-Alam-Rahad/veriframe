import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Role } from "@prisma/client";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AppConfiguration } from "../../config/configuration";
import type { AuthenticatedUser } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../prisma/prisma.service";

interface AccessPayload {
  sub: string;
  sid: string;
  typ: "access";
  role: Role;
  plan: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService<AppConfiguration, true>,
    private readonly prisma: PrismaService,
  ) {
    const accessSecret = config.get("jwt.accessSecret", { infer: true });
    const cookieName = config.get("cookies.accessName", { infer: true });

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.[cookieName] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: AccessPayload & { sid?: string }): Promise<AuthenticatedUser> {
    if (payload.typ !== "access" || !payload.sub) {
      throw new UnauthorizedException("Invalid access token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        emailVerifiedAt: true,
        bannedAt: true,
      },
    });

    if (!user) throw new UnauthorizedException("Account no longer exists");
    if (user.bannedAt) throw new UnauthorizedException("This account is suspended");

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        emailVerifiedAt: user.emailVerifiedAt,
        sessionId: payload.sid,
      };
  }
}
