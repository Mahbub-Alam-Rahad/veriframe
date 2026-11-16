"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import type { VideoStatus } from "@/lib/types";

export function AdminVideoActions({
  videoId,
  originalName,
  status,
}: {
  videoId: string;
  originalName: string;
  status: VideoStatus;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState<"retry" | "delete" | null>(null);

  async function retry() {
    setPending("retry");
    try {
      await apiRequest(`/admin/videos/${videoId}/retry`, { method: "POST" });
      toast.success("Analysis queued");
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
      await apiRequest(`/admin/videos/${videoId}`, { method: "DELETE" });
      toast.success("Video deleted");
      setConfirming(false);
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
          size="icon-sm"
          onClick={retry}
          loading={pending === "retry"}
          aria-label={`Retry analysis for ${originalName}`}
          title="Retry analysis"
        >
          {pending === "retry" ? null : <RefreshCw className="size-3.5" />}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${originalName}`}
        title="Delete video"
        className="text-muted-foreground hover:text-rose-600"
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Modal
        open={confirming}
        onClose={() => (pending ? undefined : setConfirming(false))}
        title="Delete video as administrator"
        description="The upload, analysis and evidence thumbnails are removed for the owning user. This action is audited."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
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
