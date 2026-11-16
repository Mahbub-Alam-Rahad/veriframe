import { redirect } from "next/navigation";
import { getCurrentUser } from "./api";
import type { MeResponse } from "./types";

export async function requireUser(returnTo = "/dashboard"): Promise<MeResponse> {
  const me = await getCurrentUser();
  if (!me) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return me;
}

export async function requireAdmin(returnTo = "/admin"): Promise<MeResponse> {
  const me = await requireUser(returnTo);
  if (me.user.role !== "ADMIN" && me.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return me;
}

export async function requireSuperAdmin(returnTo = "/admin"): Promise<MeResponse> {
  const me = await requireAdmin(returnTo);
  if (me.user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }
  return me;
}
