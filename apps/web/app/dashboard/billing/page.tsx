import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth-server";
import { formatBytes, formatDuration, monthLabel } from "@/lib/format";
import { PLAN_CATALOG, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Billing & plan",
  description: "Your plan, usage and available limits.",
};

export default async function BillingPage() {
  const me = await requireUser("/dashboard/billing");
  const usagePercent =
    me.limits.monthlyAnalyses > 0
      ? Math.min(100, Math.round((me.usage.analyses / me.limits.monthlyAnalyses) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Billing & plan"
        description="Plan assignments and limits are managed by the operator of this self-hosted deployment."
        actions={
          <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
            <Mail className="size-4" />
            Contact operator
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Current plan</CardTitle>
              <CardDescription>{monthLabel(me.usage.month)} usage period</CardDescription>
            </div>
            <Badge variant={me.plan.id === "FREE" ? "outline" : "default"}>{me.plan.name}</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {me.usage.analyses}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {me.limits.monthlyAnalyses} analyses
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
                {me.usage.remaining} analyses remaining · resets on the first of the month (UTC)
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Max upload
                </dt>
                <dd className="mt-1 font-semibold">{formatBytes(me.limits.maxUploadBytes)}</dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Max clip length
                </dt>
                <dd className="mt-1 font-semibold">{formatDuration(me.limits.maxVideoSeconds)}</dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  API keys
                </dt>
                <dd className="mt-1 font-semibold">
                  {me.counts.apiKeys} / {me.limits.maxApiKeys}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Media retention
                </dt>
                <dd className="mt-1 font-semibold">{me.limits.retentionDays} days</dd>
              </div>
            </dl>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <CreditCard className="mt-0.5 size-3.5 shrink-0" />
              This deployment collects no card details. Plan changes are applied by an administrator
              through the admin console.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens at a limit</CardTitle>
            <CardDescription>Limits are enforced before a job is queued.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                title: "Monthly analyses",
                body: "When the allowance is used, new uploads are paused until the next UTC month or until an administrator raises the plan.",
              },
              {
                title: "Upload size and duration",
                body: "Files are checked on both client and server. Oversized or overlong clips are rejected before storage.",
              },
              {
                title: "Retention",
                body: "Media, thumbnails and signed URLs expire automatically. Reports remain downloadable while the analysis record exists.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Available plans</h2>
          <p className="text-xs text-muted-foreground">Default limits · operator-configurable</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLAN_CATALOG[planId];
            const current = me.plan.id === planId;
            return (
              <Card
                key={planId}
                className={cn(
                  "relative",
                  current && "border-primary/40 shadow-lg shadow-primary/5",
                )}
              >
                {current ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Current
                  </span>
                ) : null}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {planId === "ENTERPRISE" ? (
                      <Sparkles className="size-4 text-primary" />
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {plan.priceMonthly > 0
                      ? `$${plan.priceMonthly}/month equivalent`
                      : planId === "FREE"
                        ? "Included with every account"
                        : "Contact the operator"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {current ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <ShieldCheck className="size-3.5" />
                      Active on your account
                    </div>
                  ) : (
                    <Link
                      href="/contact"
                      className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
                    >
                      Request this plan
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Alert variant="info" title="Self-hosted billing">
        VeriFrame does not process payments. The plans above are the default limits shipped with the
        app; the deployment operator can change them through environment variables and the admin
        console.
      </Alert>
    </div>
  );
}
