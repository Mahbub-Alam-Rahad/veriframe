"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ScanLine,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifyBanner } from "@/components/dashboard/verify-banner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, errorMessage } from "@/lib/api";
import { displayName, isAdminRole } from "@/lib/auth";
import { initials } from "@/lib/format";
import type { MeResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/analyze", label: "Analyze video", icon: ScanLine },
  { href: "/dashboard/videos", label: "Videos", icon: Video },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/api-keys", label: "API keys", icon: KeyRound },
  { href: "/dashboard/billing", label: "Billing & plan", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/models", label: "Models", icon: SlidersHorizontal },
  { href: "/admin/audit", label: "Audit log", icon: ShieldCheck },
  { href: "/admin/system", label: "System", icon: Gauge },
];

export function AppShell({
  mode,
  me,
  children,
}: {
  mode: "dashboard" | "admin";
  me: MeResponse;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const nav = mode === "admin" ? ADMIN_NAV : DASHBOARD_NAV;
  const activeItem = [...nav]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)));
  const sectionLabel = mode === "admin" ? "Admin console" : "Workspace";

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
      toast.success("Signed out");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  const usagePercent =
    me.limits.monthlyAnalyses > 0
      ? Math.round((me.usage.analyses / me.limits.monthlyAnalyses) * 100)
      : 0;

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href={mode === "admin" ? "/admin" : "/dashboard"} aria-label="VeriFrame home">
          <span className="flex items-center gap-2.5">
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="text-[16px] font-semibold tracking-tight">VeriFrame</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {sectionLabel}
              </span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={sectionLabel}>
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-2">
          {mode === "dashboard" ? (
            isAdminRole(me.user.role) ? (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
                Admin console
              </Link>
            ) : null
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          )}
        </div>
      </nav>

      {mode === "dashboard" ? (
        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {me.plan.name} plan
              </p>
              <Badge variant={me.plan.id === "FREE" ? "outline" : "default"}>{me.plan.id}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {me.usage.analyses} of {me.limits.monthlyAnalyses} analyses used
            </p>
            <Progress
              value={me.usage.analyses}
              max={me.limits.monthlyAnalyses}
              className="mt-2 h-1.5"
              indicatorClassName={
                usagePercent >= 90 ? "bg-rose-500" : usagePercent >= 70 ? "bg-amber-500" : undefined
              }
              label="Monthly analysis usage"
            />
            <Link
              href="/dashboard/billing"
              className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Manage plan →
            </Link>
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Administrator access</p>
          <p className="mt-1">Actions are recorded in the audit log.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:block">
        {navContent}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl">
            {navContent}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {sectionLabel}
                </p>
                <p className="truncate text-sm font-semibold">
                  {activeItem?.label ?? (mode === "admin" ? "Admin" : "Dashboard")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(me.user.name, me.user.email)}
                  </span>
                  <span className="hidden max-w-[130px] truncate text-sm font-medium sm:block">
                    {displayName({ name: me.user.name, email: me.user.email })}
                  </span>
                  <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
                </summary>
                <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-sm font-medium">
                      {displayName({ name: me.user.name, email: me.user.email })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{me.user.email}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Badge variant="outline">{me.user.role.replace("_", " ")}</Badge>
                      <Badge variant={me.user.plan === "FREE" ? "muted" : "default"}>
                        {me.user.plan}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Settings className="size-4" />
                    Account settings
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <CreditCard className="size-4" />
                    Plan & usage
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/10 disabled:opacity-60 dark:text-rose-400"
                  >
                    <LogOut className="size-4" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">
            {mode === "dashboard" && !me.user.emailVerifiedAt ? (
              <VerifyBanner email={me.user.email} />
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
