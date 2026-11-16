import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, ShieldCheck } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_CATALOG, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free, Pro and Enterprise plans for self-hosted deepfake detection. Compare analysis limits, upload sizes, retention and API access.",
};

const COMPARISON: Array<{
  label: string;
  value: (plan: "FREE" | "PRO" | "ENTERPRISE") => string | boolean;
}> = [
  { label: "Monthly video analyses", value: (plan) => String(PLAN_CATALOG[plan].monthlyAnalyses) },
  {
    label: "Maximum video length",
    value: (plan) => `${Math.round(PLAN_CATALOG[plan].maxVideoSeconds / 60)} minutes`,
  },
  {
    label: "Maximum upload size",
    value: (plan) => `${Math.round(PLAN_CATALOG[plan].maxUploadBytes / 1024 / 1024)} MB`,
  },
  { label: "Media retention", value: (plan) => `${PLAN_CATALOG[plan].retentionDays} days` },
  { label: "Frame timeline & evidence", value: () => true },
  { label: "PDF reports", value: () => true },
  { label: "API keys", value: (plan) => (plan === "FREE" ? false : String(PLAN_CATALOG[plan].maxApiKeys)) },
  { label: "Public REST API", value: (plan) => plan !== "FREE" },
  { label: "Priority queue", value: (plan) => plan !== "FREE" },
  { label: "Model registry access", value: (plan) => plan === "ENTERPRISE" },
];

const FAQS = [
  {
    question: "How is billing handled in a self-hosted deployment?",
    answer:
      "This build does not process payments. Plans are stored on the user record and changed by an administrator, so an operator can connect their own billing system or provision plans manually. The pricing table describes the default commercial packaging.",
  },
  {
    question: "Can limits be changed without a code change?",
    answer:
      "Monthly analysis allowances for Pro and Enterprise can be raised with environment variables. Upload and duration ceilings also have global operator limits. Plan names and feature copy are part of the web application.",
  },
  {
    question: "What happens when I hit my monthly limit?",
    answer:
      "The API rejects new uploads with a clear error until the next UTC calendar month or until an administrator raises the plan. Existing analyses remain available subject to retention.",
  },
  {
    question: "Is there a free trial of Pro?",
    answer:
      "Not automatically in this build. An administrator can move an account to Pro from the admin console if you want to evaluate the API and larger upload limits.",
  },
  {
    question: "Do unused analyses roll over?",
    answer:
      "No. Usage is tracked per UTC calendar month and does not roll over. The dashboard shows the current allowance and remaining count.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
        <div className="container relative py-16 text-center sm:py-24">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            Simple, operator-managed plans
          </Badge>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Pricing that scales with the caseload, not the hype.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Every plan includes the full analysis view, evidence thumbnails and PDF reports. Higher
            tiers add volume, longer clips, API access and retention.
          </p>
          <p className="mx-auto mt-3 text-xs text-muted-foreground">
            Self-hosted build · no card collected · administrator-managed upgrades
          </p>
        </div>
      </section>

      <section className="container -mt-2 py-16 sm:py-20">
        <PricingCards />
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Prices describe the default packaging. In a self-hosted deployment, the operator is
            responsible for contracting, invoicing and any tax obligations. The software enforces
            plan limits but does not charge a card.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Compare
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              What changes between plans.
            </h2>
          </div>
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Capability
                  </th>
                  {PLAN_ORDER.map((plan) => (
                    <th key={plan} className="px-5 py-4 text-center">
                      <span className={cn("font-semibold", plan === "PRO" && "text-primary")}>
                        {PLAN_CATALOG[plan].name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b border-border/70 last:border-0">
                    <td className="px-5 py-3.5 text-muted-foreground">{row.label}</td>
                    {PLAN_ORDER.map((plan) => {
                      const value = row.value(plan);
                      return (
                        <td key={plan} className="px-5 py-3.5 text-center">
                          {typeof value === "boolean" ? (
                            value ? (
                              <Check className="mx-auto size-4 text-emerald-500" aria-label="Included" />
                            ) : (
                              <Minus className="mx-auto size-4 text-muted-foreground/40" aria-label="Not included" />
                            )
                          ) : (
                            <span className="font-medium tabular-nums">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Limits shown are defaults and may be configured by the operator. The API is the source
            of truth for your account.
          </p>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Before you choose.</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Need a custom allowance or a procurement packet? Tell us about the workflow.
            </p>
            <Link href="/contact?subject=Enterprise" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
              Contact us
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand
        title="Start with three analyses. Decide after you see the evidence."
        description="Create an account, upload a short clip and review the frame-level result. No card, no hosted inference."
      />
    </>
  );
}
