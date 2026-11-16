import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { formatDateTime, formatUptime, titleCase } from "@/lib/format";
import type { SystemHealth } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "System health",
  description: "Database, Redis, queue, ML and storage status.",
};

export default async function AdminSystemPage() {
  await requireAdmin("/admin/system");
  let health: SystemHealth | null = null;
  let loadError: string | null = null;
  let checkedAt = new Date().toISOString();
  try {
    health = await serverApiRequest<SystemHealth>("/admin/system");
    checkedAt = new Date().toISOString();
  } catch (error) {
    loadError = errorMessage(error);
  }

  const checks = health
    ? [
        { key: "database", label: "PostgreSQL", ok: health.checks.database, icon: Database, detail: "Prisma connectivity" },
        { key: "redis", label: "Redis", ok: health.checks.redis, icon: Server, detail: "BullMQ broker" },
        { key: "ml", label: "ML service", ok: health.checks.ml.ok, icon: Cpu, detail: health.checks.ml.backend ? `${health.checks.ml.backend} backend` : "FastAPI inference" },
        { key: "storage", label: "Object storage", ok: health.checks.storage, icon: HardDrive, detail: "MinIO / S3 bucket" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="System health"
        description="Dependency checks, queue depth and runtime information. Reload to run the checks again."
        actions={
          <Link href="/admin/system" className={buttonVariants({ variant: "outline" })}>
            <RefreshCw className="size-4" />
            Re-check
          </Link>
        }
      />

      {loadError ? (
        <Alert variant="destructive" title="Could not read system health">
          {loadError}. The API itself may be unavailable. Check the container logs.
        </Alert>
      ) : null}

      {health ? (
        <>
          <Alert
            variant={health.status === "healthy" ? "success" : "warning"}
            title={health.status === "healthy" ? "All core dependencies responded" : "Degraded service"}
          >
            {health.status === "healthy"
              ? "Database, Redis, ML service and storage all responded. This does not guarantee model quality."
              : "One or more checks failed. Review the details below and the API, worker and ML logs before accepting new work."}
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {checks.map((check) => (
              <Card key={check.key}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("flex size-8 items-center justify-center rounded-lg", check.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                      <check.icon className="size-4" />
                    </span>
                    {check.ok ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <XCircle className="size-4 text-rose-500" />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium">{check.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {check.ok ? "Healthy" : "Unavailable"} · {check.detail}
                  </p>
                  {check.key === "ml" && health.checks.ml.detail ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{health.checks.ml.detail}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>

          {health.checks.ml.backend?.toLowerCase() === "mock" ? (
            <Alert variant="warning" title="ML service is running the mock backend">
              Scores are placeholders. Set <code className="font-mono text-xs">MODEL_BACKEND=hf</code>{" "}
              and restart the ML service for real inference, then register or activate an HF model
              version in the admin console.
            </Alert>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Queue</CardTitle>
                <CardDescription>Analysis jobs in Redis via BullMQ.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(health.queue).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{key}</span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </div>
                ))}
                {Object.keys(health.queue).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No queue counters returned.</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Failed jobs remain inspectable in Redis. The worker retries twice with backoff
                  before marking a video failed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Runtime</CardTitle>
                <CardDescription>API process information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Node.js", value: health.runtime.nodeVersion },
                  { label: "Environment", value: titleCase(health.runtime.environment) },
                  { label: "Uptime", value: formatUptime(health.runtime.uptimeSeconds) },
                  { label: "RSS memory", value: `${health.runtime.memoryMb} MB` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {item.label === "RSS memory" ? (
                        <MemoryStick className="size-3.5" />
                      ) : item.label === "Uptime" ? (
                        <Clock3 className="size-3.5" />
                      ) : (
                        <Server className="size-3.5" />
                      )}
                      {item.label}
                    </span>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Checked {formatDateTime(checkedAt)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Active model</CardTitle>
                  <CardDescription>Recorded on new analyses.</CardDescription>
                </div>
                <Badge variant="outline">{health.modelVersions} versions</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {health.model ? (
                  <>
                    <div>
                      <p className="text-sm font-semibold">{health.model.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {health.model.version} · {health.model.modelId}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={health.model.backend === "MOCK" ? "warning" : "info"}>
                        {health.model.backend}
                      </Badge>
                      <Badge variant="success">Active</Badge>
                      <Badge variant="outline">
                        T = {health.model.calibrationTemperature}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active model version. The ML service environment configuration is used.
                  </p>
                )}
                <Link
                  href="/admin/models"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                >
                  Manage models
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  If the ML check fails, the worker cannot score new uploads. Inspect the{" "}
                  <code className="font-mono">ml</code> container and the internal token configuration.
                </p>
                <p>
                  If Redis is down, uploads may still store files but jobs cannot be queued. Restart
                  Redis and the worker, then retry failed videos.
                </p>
                <p>
                  Storage failures after an analysis usually mean bucket credentials or lifecycle
                  policies are misconfigured. Signed URLs are short-lived by design.
                </p>
                <p className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  Retention jobs run nightly: media cleanup at 03:00, sessions and tokens at 03:30,
                  stale jobs at 03:45 (server time).
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
