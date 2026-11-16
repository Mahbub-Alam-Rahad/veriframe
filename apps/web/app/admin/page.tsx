import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Cpu,
  HardDrive,
  Mail,
  Server,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { AdminVideoActions } from "@/components/admin/admin-video-actions";
import { SignupsChart } from "@/components/admin/signups-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { formatBytes, formatRelative } from "@/lib/format";
import type { AdminStats, VideoStatus } from "@/lib/types";
import { VERDICTS } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin overview",
  description: "Platform metrics, queue health and recent failures.",
};

const STATUS_ORDER: VideoStatus[] = ["UPLOADED", "QUEUED", "PROCESSING", "DONE", "FAILED"];
const STATUS_COLORS: Record<VideoStatus, string> = {
  UPLOADED: "bg-slate-400",
  QUEUED: "bg-sky-500",
  PROCESSING: "bg-amber-500",
  DONE: "bg-emerald-500",
  FAILED: "bg-rose-500",
};

export default async function AdminOverviewPage() {
  await requireAdmin("/admin");
  let stats: AdminStats | null = null;
  let loadError: string | null = null;
  try {
    stats = await serverApiRequest<AdminStats>("/admin/stats");
  } catch (error) {
    loadError = errorMessage(error);
  }

  const videoTotal = stats?.videos.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin console"
        title="Platform overview"
        description="Users, analyses, queue pressure and service health for this deployment."
        actions={
          <>
            <Link href="/admin/system" className={buttonVariants({ variant: "outline" })}>
              <Server className="size-4" />
              System health
            </Link>
            <Link href="/admin/users" className={buttonVariants()}>
              <Users className="size-4" />
              Manage users
            </Link>
          </>
        }
      />

      {loadError ? (
        <Alert variant="destructive" title="Could not load admin metrics">
          {loadError}. The API may be starting up.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={stats?.users.total ?? "—"}
          hint={stats ? `${stats.users.verified} verified · ${stats.users.newLast7Days} new this week` : undefined}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Videos"
          value={videoTotal}
          hint={stats ? `${formatBytes(stats.videos.storageBytes)} stored` : undefined}
          icon={Video}
          tone="default"
        />
        <StatCard
          label="Analyses"
          value={stats?.analyses.total ?? "—"}
          hint={
            stats?.analyses.averageScore === null || stats?.analyses.averageScore === undefined
              ? "No completed analyses"
              : `Average score ${stats.analyses.averageScore} / 100`
          }
          icon={BarChart3}
          tone="success"
        />
        <StatCard
          label="New messages"
          value={stats?.messages.new ?? "—"}
          hint="Unread contact submissions"
          icon={Mail}
          tone={stats && stats.messages.new > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Signups · last 7 days</CardTitle>
              <CardDescription>New accounts per day (UTC).</CardDescription>
            </div>
            <Badge variant="outline">{stats?.users.newLast7Days ?? 0} total</Badge>
          </CardHeader>
          <CardContent>
            <SignupsChart data={stats?.signupsByDay ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Queue</CardTitle>
              <CardDescription>BullMQ analysis jobs.</CardDescription>
            </div>
            <Link
              href="/admin/system"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Details
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Waiting", stats?.queue.counts.waiting ?? 0],
              ["Active", stats?.queue.counts.active ?? 0],
              ["Completed", stats?.queue.counts.completed ?? 0],
              ["Failed", stats?.queue.counts.failed ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums">{value}</span>
              </div>
            ))}
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              {stats?.queue.oldestWaitingSeconds === null || stats?.queue.oldestWaitingSeconds === undefined
                ? "No jobs are waiting."
                : `Oldest waiting job: ${stats.queue.oldestWaitingSeconds}s. A growing backlog usually means the worker is stopped or the ML service is unreachable.`}
            </div>
            <Link
              href="/admin/videos?status=FAILED"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              <AlertTriangle className="size-3.5" />
              Review failed jobs
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Video status</CardTitle>
            <CardDescription>Current pipeline distribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {STATUS_ORDER.map((status) => {
              const count = stats?.videos.byStatus[status] ?? 0;
              const percent = videoTotal > 0 ? Math.round((count / videoTotal) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium capitalize text-muted-foreground">
                      {status.toLowerCase()}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", STATUS_COLORS[status])}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdicts</CardTitle>
            <CardDescription>Completed analyses by verdict.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(VERDICTS) as Array<keyof typeof VERDICTS>).map((verdict) => {
              const count = stats?.analyses.byVerdict[verdict] ?? 0;
              const total = stats?.analyses.total ?? 0;
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={verdict}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">{VERDICTS[verdict].label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {count} · {percent}%
                    </span>
                  </div>
                  <Progress
                    value={count}
                    max={Math.max(1, total)}
                    className="mt-1.5 h-1.5"
                    indicatorClassName={cn(
                      verdict === "LIKELY_FAKE"
                        ? "bg-rose-500"
                        : verdict === "UNCERTAIN"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                  />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Verdict share is descriptive, not a measure of model accuracy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Active model</CardTitle>
              <CardDescription>Used for new analyses.</CardDescription>
            </div>
            <Cpu className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.activeModel ? (
              <>
                <div>
                  <p className="text-sm font-semibold">{stats.activeModel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeModel.version} · {stats.activeModel.modelId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={stats.activeModel.backend === "MOCK" ? "warning" : "info"}>
                    {stats.activeModel.backend}
                  </Badge>
                  <Badge variant="success">Active</Badge>
                </div>
                {stats.activeModel.backend === "MOCK" ? (
                  <Alert variant="warning" icon={false}>
                    Mock backend for demonstration. Switch <code className="font-mono">MODEL_BACKEND</code>{" "}
                    to <code className="font-mono">hf</code> for real inference.
                  </Alert>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active model version is registered. The worker falls back to the ML service
                environment configuration.
              </p>
            )}
            <Link
              href="/admin/models"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              <ShieldCheck className="size-3.5" />
              Manage models
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Recent failures</CardTitle>
            <CardDescription>The latest failed video analyses.</CardDescription>
          </div>
          <Link
            href="/admin/videos?status=FAILED"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            All failed
            <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {!stats || stats.recentFailed.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <Activity className="size-4 text-emerald-500" />
              No failed analyses. The queue is healthy.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentFailed.map((video) => (
                <li key={video.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{video.originalName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {video.user.email} · {formatRelative(video.updatedAt)}
                    </p>
                    {video.error ? (
                      <p className="mt-1 line-clamp-1 text-xs text-rose-600 dark:text-rose-400">
                        {video.error}
                      </p>
                    ) : null}
                  </div>
                  <AdminVideoActions
                    videoId={video.id}
                    originalName={video.originalName}
                    status="FAILED"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/users", label: "Users & plans", icon: Users, body: "Roles, plans and suspensions." },
          { href: "/admin/messages", label: "Contact inbox", icon: Mail, body: "Triage public contact messages." },
          { href: "/admin/audit", label: "Audit log", icon: ShieldCheck, body: "Review privileged actions." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <HardDrive className="size-3.5" />
        Storage usage reflects stored uploads. Evidence thumbnails and database rows may add a small
        overhead.
      </div>
    </div>
  );
}
