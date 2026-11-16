import { cn } from "@/lib/utils";
import { scoreTone, verdictMeta } from "@/lib/verdicts";
import type { Verdict } from "@/lib/types";

const toneColor = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#f43f5e",
} as const;

export function ScoreGauge({
  score,
  verdict,
  confidence,
  size = "default",
  className,
}: {
  score: number;
  verdict?: Verdict;
  confidence?: number;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  const color = toneColor[tone];
  const radius = 74;
  const length = Math.PI * radius;
  const filled = (clamped / 100) * length;
  const meta = verdict ? verdictMeta(verdict) : null;

  const dimensions =
    size === "sm" ? "max-w-[190px]" : size === "lg" ? "max-w-[340px]" : "max-w-[260px]";

  return (
    <div className={cn("w-full", dimensions, className)}>
      <svg viewBox="0 0 200 120" className="w-full" role="img" aria-label={`Fake score ${clamped} out of 100`}>
        <path
          d="M26 104 A74 74 0 0 1 174 104"
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M26 104 A74 74 0 0 1 174 104"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${length}`}
          style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <text
          x="100"
          y="84"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 38, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(clamped)}
        </text>
        <text
          x="100"
          y="103"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}
        >
          fake score / 100
        </text>
      </svg>
      <div className="mt-1 text-center">
        {meta ? (
          <p className="text-sm font-semibold" style={{ color }}>
            {meta.label}
          </p>
        ) : null}
        {confidence !== undefined ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Confidence {(confidence * 100).toFixed(1)}%
          </p>
        ) : null}
      </div>
    </div>
  );
}
