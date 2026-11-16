import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Plan, Role, VerificationType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/decorators/auth.decorators";
import {
  durationToSeconds,
  hashPassword,
  randomId,
  randomToken,
  sha256,
  verifyPassword,
} from "../common/utils/crypto";
import { toSafeUser } from "../common/utils/serializers";
import type { AppConfiguration } from "../config/configuration";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthTokens } from "./cookies";
import type { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto/auth.dto";

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  private get config(): AppConfiguration {
    return {
      jwt: this.configService.get("jwt", { infer: true }),
      cookies: this.configService.get("cookies", { infer: true }),
      exposeDevTokens: this.configService.get("exposeDevTokens", { infer: true }),
      publicWebUrl: this.configService.get("publicWebUrl", { infer: true }),
    } as AppConfiguration;
  }

  async register(dto: RegisterDto, context: RequestContext) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name?.trim() || null,
        passwordHash,
        role: Role.USER,
        plan: Plan.FREE,
      },
    });

    const token = await this.createVerificationToken(user.id, VerificationType.EMAIL_VERIFY, 24);
    await this.mail.sendVerificationEmail(user.email, user.name, token);

    await this.audit.record({
      actorId: user.id,
      action: "auth.register",
      targetType: "user",
      targetId: user.id,
      ip: context.ip,
    });

    return {
      message: "Account created. Check your email to verify your address before uploading videos.",
      user: toSafeUser(user),
      devVerificationUrl: this.config.exposeDevTokens
        ? `${this.config.publicWebUrl}/verify-email?token=${encodeURIComponent(token)}`
        : undefined,
    };
  }

  async login(dto: LoginDto, context: RequestContext) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      await this.audit.record({
        action: "auth.login_failed",
        targetType: "email",
        targetId: email.slice(0, 120),
        ip: context.ip,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.bannedAt) throw new UnauthorizedException("This account is suspended");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.plan, context);
    await this.audit.record({
      actorId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      ip: context.ip,
    });

    return { user: toSafeUser(user), tokens };
  }

  async refresh(refreshToken: string | undefined, context: RequestContext) {
    if (!refreshToken) throw new UnauthorizedException("No refresh session");

    let payload: { sub: string; sid: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Refresh session is invalid or expired");
    }

    if (payload.typ !== "refresh" || !payload.sub || !payload.sid) {
      throw new UnauthorizedException("Refresh session is invalid");
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Refresh session was not found");
    }

    if (session.tokenHash !== sha256(refreshToken)) {
      // A validly signed token whose hash is not stored means rotation reuse.
      await this.prisma.session.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh session reuse detected; all sessions were revoked");
    }

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Refresh session is no longer active");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.bannedAt) throw new UnauthorizedException("Account is unavailable");

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.plan, context);
    return { user: toSafeUser(user), tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sid?: string; sub?: string }>(refreshToken, {
        secret: this.config.jwt.refreshSecret,
        ignoreExpiration: true,
      });
      if (payload.sid) {
        await this.prisma.session.updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // Clearing cookies is still successful if the token was already invalid.
    }
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: sha256(token) },
    });

    if (
      !record ||
      record.type !== VerificationType.EMAIL_VERIFY ||
      record.usedAt ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException("This verification link is invalid or has expired");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: record.userId,
      action: "auth.email_verified",
      targetType: "user",
      targetId: record.userId,
    });

    return { message: "Email verified successfully" };
  }

  async resendVerification(email: string): Promise<{ message: string; devVerificationUrl?: string }> {
    const message = "If an unverified account exists for that address, a new link has been sent.";
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || user.emailVerifiedAt) return { message };

    const token = await this.createVerificationToken(user.id, VerificationType.EMAIL_VERIFY, 24);
    await this.mail.sendVerificationEmail(user.email, user.name, token);
    return {
      message,
      devVerificationUrl: this.config.exposeDevTokens
        ? `${this.config.publicWebUrl}/verify-email?token=${encodeURIComponent(token)}`
        : undefined,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; devResetUrl?: string }> {
    const message = "If an account exists for that address, a password reset link has been sent.";
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || user.bannedAt) return { message };

    const token = await this.createVerificationToken(
      user.id,
      VerificationType.PASSWORD_RESET,
      60,
    );
    await this.mail.sendPasswordResetEmail(user.email, user.name, token);
    return {
      message,
      devResetUrl: this.config.exposeDevTokens
        ? `${this.config.publicWebUrl}/reset-password?token=${encodeURIComponent(token)}`
        : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
    });

    if (
      !record ||
      record.type !== VerificationType.PASSWORD_RESET ||
      record.usedAt ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException("This reset link is invalid or has expired");
    }

    const passwordHash = await hashPassword(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: record.userId,
      action: "auth.password_reset",
      targetType: "user",
      targetId: record.userId,
    });

    return { message: "Password reset successfully. You can now sign in." };
  }

  async changePassword(
    user: AuthenticatedUser & { sessionId?: string },
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record) throw new NotFoundException("User not found");
    if (!(await verifyPassword(record.passwordHash, currentPassword))) {
      throw new BadRequestException("Current password is incorrect");
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(user.sessionId ? { id: { not: user.sessionId } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorId: user.id,
      action: "auth.password_changed",
      targetType: "user",
      targetId: user.id,
    });

    return { message: "Password updated. Other sessions have been signed out." };
  }

  private async createVerificationToken(
    userId: string,
    type: VerificationType,
    ttlMinutes: number,
  ): Promise<string> {
    const token = randomToken(32);
    await this.prisma.verificationToken.deleteMany({
      where: { userId, type, usedAt: null },
    });
    await this.prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    return token;
  }

  private async issueTokens(
    userId: string,
    role: Role,
    plan: Plan,
    context: RequestContext,
  ): Promise<AuthTokens> {
    const sessionId = randomId();
    const refreshExpiresIn = durationToSeconds(this.config.jwt.refreshTtl, 2_592_000);

    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, role, plan, typ: "access" },
      {
        secret: this.config.jwt.accessSecret,
        expiresIn: this.config.jwt.accessTtl,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, typ: "refresh" },
      {
        secret: this.config.jwt.refreshSecret,
        expiresIn: this.config.jwt.refreshTtl,
      },
    );

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        tokenHash: sha256(refreshToken),
        userAgent: context.userAgent?.slice(0, 400),
        ip: context.ip,
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
