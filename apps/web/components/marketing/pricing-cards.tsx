import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_CATALOG, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("grid gap-5", compact ? "lg:grid-cols-3" : "lg:grid-cols-3")}>
      {PLAN_ORDER.map((planId) => {
        const plan = PLAN_CATALOG[planId];
        const highlighted = planId === "PRO";
        const cta =
          planId === "FREE"
            ? { href: "/register", label: "Start free" }
            : planId === "PRO"
              ? { href: "/contact?subject=Pro%20plan", label: "Ask about Pro" }
              : { href: "/contact?subject=Enterprise", label: "Talk to sales" };

        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card p-6 shadow-soft",
              highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
            )}
          >
            {highlighted ? (
              <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">
                Most popular
              </Badge>
            ) : null}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.priceMonthly > 0 ? (
                <p className="text-sm text-muted-foreground">
                  <span className="text-2xl font-semibold text-foreground">${plan.priceMonthly}</span>
                  /mo
                </p>
              ) : planId === "ENTERPRISE" ? (
                <p className="text-sm text-muted-foreground">Custom</p>
              ) : (
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">$0</p>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {planId === "FREE"
                ? "For evaluating the platform on short clips."
                : planId === "PRO"
                  ? "For investigators and small teams with regular caseloads."
                  : "For newsrooms, platforms and compliance teams at volume."}
            </p>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <Check
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      highlighted ? "text-primary" : "text-emerald-500",
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={cta.href}
              className={cn(
                buttonVariants({ variant: highlighted ? "default" : "outline" }),
                "mt-6 w-full",
              )}
            >
              {cta.label}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
