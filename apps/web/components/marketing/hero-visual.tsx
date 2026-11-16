import { ScoreGauge } from "@/components/score-gauge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FRAME_BARS = [18, 26, 21, 34, 28, 42, 38, 51, 47, 62, 71, 66, 82, 74, 68, 59, 44, 39];

export function HeroVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-6 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 via-violet-500/10 to-cyan-400/20 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-400" />
            <span className="size-2 rounded-full bg-amber-400" />
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              interview-final.mp4
            </span>
          </div>
          <Badge variant="warning">Uncertain</Badge>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_1.1fr] sm:p-6">
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-4">
            <ScoreGauge score={47} verdict="UNCERTAIN" confidence={0.63} size="sm" />
            <div className="mt-3 grid w-full grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-background/80 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Frames</p>
                <p className="text-sm font-semibold tabular-nums">84</p>
              </div>
              <div className="rounded-lg bg-background/80 p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Faces</p>
                <p className="text-sm font-semibold tabular-nums">79</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Signal timeline</p>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">0:42</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-1" aria-hidden="true">
              {FRAME_BARS.map((value, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 rounded-sm",
                    value >= 70
                      ? "bg-rose-400/80"
                      : value >= 40
                        ? "bg-amber-400/80"
                        : "bg-emerald-400/70",
                  )}
                  style={{ height: `${Math.max(10, value)}%` }}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Temporal consistency</span>
                <span className="font-medium tabular-nums">61%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[61%] rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
          <p className="text-[11px] text-muted-foreground">
            Probabilistic signal · not proof of manipulation
          </p>
          <span className="text-[11px] font-medium text-primary">View evidence</span>
        </div>
      </div>
    </div>
  );
}
