import type { CookieOptions, Response } from "express";
import type { AppConfiguration } from "../config/configuration";
import { durationToSeconds } from "../common/utils/crypto";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const cookieOptions = (
  config: AppConfiguration,
  maxAgeSeconds: number,
): CookieOptions => ({
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: "lax",
  domain: config.cookies.domain,
  path: "/",
  maxAge: maxAgeSeconds * 1000,
});

export function setAuthCookies(
  response: Response,
  tokens: AuthTokens,
  config: AppConfiguration,
): void {
  response.cookie(
    config.cookies.accessName,
    tokens.accessToken,
    cookieOptions(config, durationToSeconds(config.jwt.accessTtl, 900)),
  );
  response.cookie(
    config.cookies.refreshName,
    tokens.refreshToken,
    cookieOptions(config, durationToSeconds(config.jwt.refreshTtl, 2_592_000)),
  );
}

export function clearAuthCookies(response: Response, config: AppConfiguration): void {
  const base: CookieOptions = {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: "lax",
    domain: config.cookies.domain,
    path: "/",
  };
  response.clearCookie(config.cookies.accessName, base);
  response.clearCookie(config.cookies.refreshName, base);
}
