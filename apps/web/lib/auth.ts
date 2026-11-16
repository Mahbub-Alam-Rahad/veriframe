import type { Role, SessionUser } from "./types";

export const ACCESS_COOKIE = "vf_access";
export const REFRESH_COOKIE = "vf_refresh";

export const DASHBOARD_ROUTES = ["/dashboard"];
export const ADMIN_ROUTES = ["/admin"];

export function isAdminRole(role: Role | string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function displayName(user: Pick<SessionUser, "name" | "email">): string {
  return user.name?.trim() || user.email.split("@")[0] || user.email;
}

export function loginHref(nextPath?: string): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return "/login";
  return `/login?next=${encodeURIComponent(nextPath)}`;
}
