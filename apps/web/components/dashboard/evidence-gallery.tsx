"use client";

import * as React from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatDuration } from "@/lib/format";
import type { FlaggedFrame } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EvidenceGallery({ frames }: { frames: FlaggedFrame[] }) {
  const [active, setActive] = React.useState<FlaggedFrame | null>(null);

  if (frames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
        <ImageOff className="size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No evidence frames were stored</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          The analysis completed without producing annotated face crops. The frame timeline above
          still shows the score distribution.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {frames
          .filter((frame) => frame.url)
          .map((frame) => (
            <button
              key={`${frame.index}-${frame.rank ?? 0}`}
              type="button"
              onClick={() => setActive(frame)}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frame.url ?? ""}
                alt={`Evidence frame at ${formatDuration(frame.timestampSeconds)} with fake score ${Math.round(frame.score * 100)}`}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-medium text-white">
                <span>{formatDuration(frame.timestampSeconds)}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-semibold text-white",
                    frame.score >= 0.7 ? "bg-rose-500" : frame.score >= 0.4 ? "bg-amber-500" : "bg-emerald-500",
                  )}
                >
                  {Math.round(frame.score * 100)}
                </span>
              </span>
              <span className="absolute right-1.5 top-1.5 rounded bg-slate-950/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="size-3" />
              </span>
            </button>
          ))}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={`Evidence frame ${active?.rank ? `#${active.rank}` : ""}`}
        description={
          active
            ? `${formatDuration(active.timestampSeconds)} · fake score ${Math.round(active.score * 100)} / 100`
            : undefined
        }
        className="max-w-3xl"
      >
        {active?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.url}
            alt={`Enlarged evidence frame at ${formatDuration(active.timestampSeconds)}`}
            className="w-full rounded-lg border border-border"
          />
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          The bounding box marks the face crop that produced this score. Annotated crops are stored
          with the analysis and expire with the media.
        </p>
      </Modal>
    </>
  );
}
