import { Badge } from "@/components/ui/badge";
import { verdictMeta } from "@/lib/verdicts";
import type { Verdict } from "@/lib/types";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const meta = verdictMeta(verdict);
  return (
    <Badge variant={meta.tone} className={className}>
      {meta.short}
    </Badge>
  );
}

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const variant = score >= 70 ? "danger" : score >= 40 ? "warning" : "success";
  return (
    <Badge variant={variant} className={className}>
      {Math.round(score)} / 100
    </Badge>
  );
}
