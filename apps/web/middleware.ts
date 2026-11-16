import { decodeJwt } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, isAdminRole } from "./lib/auth";

interface AccessClaims {
  sub?: string;
  role?: string;
  exp?: number;
  typ?: string;
}

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

function decodeAccess(token: string | undefined): AccessClaims | null {
  if (!token) return null;
  try {
    const claims = decodeJwt(token) as AccessClaims;
    if (claims.typ && claims.typ !== "access") return null;
    return claims;
  } catch {
    return null;
  }
}

function isFresh(claims: AccessClaims | null): boolean {
  if (!claims?.exp) return false;
  return claims.exp * 1000 - 5_000 > Date.now();
}

function accessFromSetCookies(setCookies: string[]): string | undefined {
  for (const cookie of setCookies) {
    const match = cookie.match(new RegExp(`(?:^|,\\s*)${ACCESS_COOKIE}=([^;]+)`));
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return undefined;
}

function getSetCookies(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const combined = response.headers.get("set-cookie");
  return combined ? [combined] : [];
}

function cookieHeaderFromRequest(request: NextRequest, replaced?: { name: string; value: string }): string {
  return request.cookies
    .getAll()
    .map((cookie) => {
      if (replaced && cookie.name === replaced.name) return `${cookie.name}=${replaced.value}`;
      return `${cookie.name}=${cookie.value}`;
    })
    .join("; ");
}

function redirectWithNext(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/login";
  url.search = "";
  if (next && next !== "/dashboard") url.searchParams.set("next", next);
  const response = NextResponse.redirect(url);
  response.cookies.delete(ACCESS_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  let claims = decodeAccess(accessToken);
  let response: NextResponse | null = null;
  let rotatedCookies: string[] = [];

  if (!isFresh(claims) && refreshToken) {
    const apiBase = (process.env.API_INTERNAL_URL ?? "http://localhost:3001").replace(/\/$/, "");
    try {
      const refreshResponse = await fetch(`${apiBase}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          cookie: `${REFRESH_COOKIE}=${refreshToken}`,
          "content-type": "application/json",
        },
        cache: "no-store",
      });

      if (refreshResponse.ok) {
        rotatedCookies = getSetCookies(refreshResponse);
        const newAccess = accessFromSetCookies(rotatedCookies);
        claims = decodeAccess(newAccess);
        const headers = new Headers(request.headers);
        if (newAccess) {
          headers.set(
            "cookie",
            cookieHeaderFromRequest(request, { name: ACCESS_COOKIE, value: newAccess }),
          );
        }
        response = NextResponse.next({ request: { headers } });
        for (const cookie of rotatedCookies) {
          response.headers.append("set-cookie", cookie);
        }
      }
    } catch {
      // Network failure: fall through to the normal auth checks.
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const authenticated = isFresh(claims);

  if (isProtected && !authenticated) {
    return redirectWithNext(request);
  }

  if (pathname.startsWith("/admin") && authenticated && !isAdminRole(claims?.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response ?? NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
