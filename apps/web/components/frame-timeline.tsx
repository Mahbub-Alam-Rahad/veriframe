"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration } from "@/lib/format";
import type { FrameScore } from "@/lib/types";

export function FrameTimeline({ frames }: { frames: FrameScore[] }) {
  const data = frames.map((frame) => ({
    time: Number(frame.timestampSeconds.toFixed(2)),
    score: Math.round(frame.score * 1000) / 10,
    face: frame.faceDetected,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No frame-level scores were stored for this analysis.
      </div>
    );
  }

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <ReferenceArea y1={0} y2={40} fill="#10b981" fillOpacity={0.05} />
          <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.06} />
          <ReferenceArea y1={70} y2={100} fill="#f43f5e" fillOpacity={0.06} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => formatDuration(value)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 40, 70, 100]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            labelFormatter={(value) => `Timestamp ${formatDuration(Number(value))}`}
            formatter={(value) => [`${Number(value).toFixed(1)} / 100`, "Fake score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#scoreFill)"
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
