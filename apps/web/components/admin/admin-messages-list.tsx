"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ContactMessage, ContactStatus } from "@/lib/types";

const STATUSES: ContactStatus[] = ["NEW", "READ", "IN_PROGRESS", "RESOLVED"];

const STATUS_VARIANTS: Record<ContactStatus, "info" | "muted" | "warning" | "success"> = {
  NEW: "info",
  READ: "muted",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
};

export function AdminMessagesList({ initialItems }: { initialItems: ContactMessage[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function updateStatus(message: ContactMessage, status: ContactStatus) {
    if (status === message.status) return;
    setPendingId(message.id);
    try {
      await apiRequest(`/admin/messages/${message.id}`, {
        method: "PATCH",
        body: { status },
      });
      setItems((current) =>
        current.map((item) => (item.id === message.id ? { ...item, status } : item)),
      );
      toast.success("Message status updated");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((message) => (
        <article key={message.id} className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {message.status === "NEW" ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{message.subject ?? "(no subject)"}</p>
                  <Badge variant={STATUS_VARIANTS[message.status]}>
                    {message.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {message.name} ·{" "}
                  <a href={`mailto:${message.email}`} className="hover:text-foreground hover:underline">
                    {message.email}
                  </a>
                  {message.ip ? ` · ${message.ip}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">
                {formatDateTime(message.createdAt)} · {formatRelative(message.createdAt)}
              </span>
              <Select
                value={message.status}
                disabled={pendingId === message.id}
                aria-label={`Status for message from ${message.name}`}
                onChange={(event) => updateStatus(message, event.target.value as ContactStatus)}
                className="h-8 w-36 text-xs"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground">
            {message.message}
          </p>
          <p className="mt-2 text-xs text-muted-foreground sm:hidden">
            {formatDateTime(message.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}
