import { Badge } from "@/components/ui/badge";
import type { VideoStatus } from "@/lib/types";

const styles: Record<VideoStatus, { label: string; variant: "muted" | "info" | "warning" | "success" | "danger" }> = {
  UPLOADED: { label: "Uploaded", variant: "muted" },
  QUEUED: { label: "Queued", variant: "info" },
  PROCESSING: { label: "Processing", variant: "warning" },
  DONE: { label: "Complete", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
};

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const style = styles[status] ?? styles.UPLOADED;
  return <Badge variant={style.variant}>{style.label}</Badge>;
}
