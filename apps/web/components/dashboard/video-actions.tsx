"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import type { VideoStatus } from "@/lib/types";

export function VideoActions({
  videoId,
  originalName,
  status,
  size = "sm",
  redirectTo,
}: {
  videoId: string;
  originalName: string;
  status: VideoStatus;
  size?: "sm" | "default";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<"retry" | "delete" | null>(null);

  async function retry() {
    setPending("retry");
    try {
      await apiRequest(`/videos/${videoId}/retry`, { method: "POST" });
      toast.success("Analysis queued again");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("delete");
    try {
      await apiRequest(`/videos/${videoId}`, { method: "DELETE" });
      toast.success("Video and stored media deleted");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "PROCESSING" ? (
        <Button
          type="button"
          variant="ghost"
          size={size === "sm" ? "icon-sm" : "icon"}
          onClick={retry}
          loading={pending === "retry"}
          aria-label={`Re-run analysis for ${originalName}`}
          title="Re-run analysis"
        >
          {pending === "retry" ? null : <RefreshCw className="size-3.5" />}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size={size === "sm" ? "icon-sm" : "icon"}
        onClick={() => setOpen(true)}
        aria-label={`Delete ${originalName}`}
        title="Delete video"
        className="text-muted-foreground hover:text-rose-600"
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Delete this video?"
        description="This permanently removes the upload, analysis and evidence thumbnails. It cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending === "delete"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={remove}
              loading={pending === "delete"}
            >
              <Trash2 className="size-4" />
              Delete video
            </Button>
          </>
        }
      >
        <p className="truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {originalName}
        </p>
      </Modal>
    </div>
  );
}

export function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="group relative inline-block text-left">
      <summary className="flex cursor-pointer list-none items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        <MoreHorizontal className="size-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-[140px] flex-col gap-1 rounded-lg border border-border bg-card p-1 shadow-xl">
        {children}
      </div>
    </details>
  );
}
