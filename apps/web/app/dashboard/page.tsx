import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FileText,
  Gauge,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ScoreBadge } from "@/components/score-badge";
import { ScoreGauge } from "@/components/score-gauge";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { StatCard } from "@/components/stat-card";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { displayName } from "@/lib/auth";
import { formatDate, formatRelative, monthLabel } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";
import { DISCLAIMER } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your VeriFrame analysis activity and account usage.",
};

export default async function DashboardPage() {
  const me = await requireUser("/dashboard");
  let stats: DashboardStats | null = null;
  let loadError: string | null = null;

  try {
    stats = await serverApiRequest<DashboardStats>("/me/stats");
  } catch (error) {
    loadError = errorMessage(error);
  }

  const usagePercent =
    me.limits.monthlyAnalyses > 0
      ? Math.round((me.usage.analyses / me.limits.monthlyAnalyses) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${displayName({ name: me.user.name, email: me.user.email })}`}
        description="A snapshot of your recent analyses, usage and verification activity."
        actions={
          <>
            <Link href="/dashboard/analyze" className={buttonVariants()}>
              <ScanLine className="size-4" />
              Analyze video
            </Link>
            <Link href="/dashboard/reports" className={buttonVariants({ variant: "outline" })}>
              <FileText className="size-4" />
              Reports
            </Link>
          </>
        }
      />

      {loadError ? (
        <Alert variant="destructive" title="Could not load activity">
          {loadError}. The API may be starting up. Refresh the page to try again.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total videos"
          value={stats?.totalVideos ?? me.counts.videos}
          hint={`${me.counts.videos} stored uploads`}
          icon={Video}
          tone="info"
        />
        <StatCard
          label="Completed analyses"
          value={stats?.totalAnalyses ?? 0}
          hint="All time"
          icon={Gauge}
          tone="default"
        />
        <StatCard
          label="Average fake score"
          value={stats?.averageScore === null || stats?.averageScore === undefined ? "—" : stats.averageScore}
          hint="Average across completed analyses"
          icon={TrendingUp}
          tone={
            stats?.averageScore === null || stats?.averageScore === undefined
              ? "default"
              : stats.averageScore >= 70
                ? "danger"
                : stats.averageScore >= 40
                  ? "warning"
                  : "success"
          }
        />
        <StatCard
          label="Analyses remaining"
          value={me.usage.remaining}
          hint={`${monthLabel(me.usage.month)} · ${me.plan.name} plan`}
          icon={Sparkles}
          tone={me.usage.remaining === 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Score trend</CardTitle>
              <CardDescription>Fake scores from your most recent completed analyses.</CardDescription>
            </div>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View reports
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart points={stats?.scoreTrend ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>{monthLabel(me.usage.month)} allowance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {me.usage.analyses}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {me.limits.monthlyAnalyses}
                  </span>
                </p>
                <span className="text-xs font-medium text-muted-foreground">{usagePercent}%</span>
              </div>
              <Progress
                value={me.usage.analyses}
                max={me.limits.monthlyAnalyses}
                className="mt-2.5"
                indicatorClassName={
                  usagePercent >= 90 ? "bg-rose-500" : usagePercent >= 70 ? "bg-amber-500" : undefined
                }
                label="Monthly analysis usage"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {me.usage.remaining} remaining · resets on the first of the month (UTC)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan</p>
                <p className="mt-1 font-semibold">{me.plan.name}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Retention</p>
                <p className="mt-1 font-semibold">{me.limits.retentionDays} days</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">API keys</p>
                <p className="mt-1 font-semibold">
                  {me.counts.apiKeys} / {me.limits.maxApiKeys}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max upload</p>
                <p className="mt-1 font-semibold">{Math.round(me.limits.maxUploadBytes / 1024 / 1024)} MB</p>
              </div>
            </div>

            <Link
              href="/dashboard/billing"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              Plan details
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent videos</CardTitle>
              <CardDescription>Your latest uploads and analysis state.</CardDescription>
            </div>
            <Link
              href="/dashboard/videos"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All videos
              <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {!stats || stats.recentVideos.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No videos yet"
                description="Upload a short clip to see a frame-level analysis and an evidence timeline."
                action={
                  <Link href="/dashboard/analyze" className={buttonVariants({ size: "sm" })}>
                    <ScanLine className="size-4" />
                    Analyze your first video
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentVideos.map((video) => (
                  <li key={video.id}>
                    <Link
                      href={`/dashboard/videos/${video.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{video.originalName}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(video.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelative(video.createdAt)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {video.analysis ? <ScoreBadge score={video.analysis.fakeScore} /> : null}
                        <VideoStatusBadge status={video.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Jump back into the workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/dashboard/analyze", label: "Upload a new video", icon: ScanLine },
                { href: "/dashboard/api-keys", label: "Create an API key", icon: ShieldCheck },
                { href: "/docs", label: "Read the API docs", icon: FileText },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-lg border border-border px-3.5 py-3 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-accent"
                >
                  <span className="flex items-center gap-2.5">
                    <action.icon className="size-4 text-primary" />
                    {action.label}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center py-1">
                <ScoreGauge
                  score={stats?.averageScore ?? 0}
                  confidence={undefined}
                  size="sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processing</p>
                  <p className="mt-1 font-semibold tabular-nums">{stats?.counts.PROCESSING ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Queued</p>
                  <p className="mt-1 font-semibold tabular-nums">{stats?.counts.QUEUED ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Failed</p>
                  <p className="mt-1 font-semibold tabular-nums">{stats?.counts.FAILED ?? 0}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completed</p>
                  <p className="mt-1 font-semibold tabular-nums">{stats?.counts.DONE ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert variant="warning" title="Scores are probabilistic, not proof" icon>
        {DISCLAIMER}
      </Alert>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        Retention: media expires after {me.limits.retentionDays} days on the {me.plan.name} plan.
      </div>
    </div>
  );
}
