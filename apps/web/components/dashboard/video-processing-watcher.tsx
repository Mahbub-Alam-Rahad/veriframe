"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Spinner } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api";
import type { Video } from "@/lib/types";

/**
 * Refreshes the server-rendered detail page while an analysis is still queued
 * or processing. Uses the same polling cadence as the upload workspace.
 */
export function VideoProcessingWatcher({ videoId }: { videoId: string }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["video-watch", videoId],
    queryFn: () => apiRequest<Video>(`/videos/${videoId}`),
    refetchInterval: (query) => {
      const video = query.state.data as Video | undefined;
      if (!video) return 3000;
      return ["UPLOADED", "QUEUED", "PROCESSING"].includes(video.status) ? 3000 : false;
    },
  });

  React.useEffect(() => {
    if (data && (data.status === "DONE" || data.status === "FAILED")) {
      router.refresh();
    }
  }, [data, router]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Spinner className="size-3.5" />
      <ScanLine className="size-3.5" />
      Checking for updates automatically…
    </div>
  );
}
