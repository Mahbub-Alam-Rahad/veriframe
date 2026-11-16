import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/auth.decorators";
import type { AppConfiguration } from "../config/configuration";
import { AuthService } from "./auth.service";
import { clearAuthCookies, setAuthCookies } from "./cookies";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Create an account and send a verification email" })
  async register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.auth.register(dto, contextFrom(request));
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  @ApiOperation({ summary: "Sign in and receive HTTP-only session cookies" })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, contextFrom(request));
    setAuthCookies(response, result.tokens, this.appConfig);
    return { user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  @ApiOperation({ summary: "Rotate the refresh session and issue a new access token" })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookieName = this.appConfig.cookies.refreshName;
    const token = request.cookies?.[cookieName] as string | undefined;
    const result = await this.auth.refresh(token, contextFrom(request));
    setAuthCookies(response, result.tokens, this.appConfig);
    return { user: result.user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("logout")
  @ApiOperation({ summary: "Revoke the refresh session and clear cookies" })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[this.appConfig.cookies.refreshName] as string | undefined;
    await this.auth.logout(token);
    clearAuthCookies(response, this.appConfig);
    return { message: "Signed out" };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("verify-email")
  @ApiOperation({ summary: "Verify an email address with a one-time token" })
  async verifyEmail(@Body() dto: TokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("resend-verification")
  @ApiOperation({ summary: "Resend the verification email" })
  async resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  @ApiOperation({ summary: "Request a password reset link" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  @ApiOperation({ summary: "Set a new password with a one-time reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Get("session")
  @ApiOperation({ summary: "Return the current authenticated session" })
  session(@Req() request: Request & { user?: unknown }) {
    if (!request.user) throw new UnauthorizedException();
    return { user: request.user };
  }

  private get appConfig(): AppConfiguration {
    return {
      jwt: this.config.get("jwt", { infer: true }),
      cookies: this.config.get("cookies", { infer: true }),
    } as AppConfiguration;
  }
}

function contextFrom(request: Request): { ip?: string; userAgent?: string } {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  };
}
