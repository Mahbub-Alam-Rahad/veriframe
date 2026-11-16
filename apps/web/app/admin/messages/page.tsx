import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Mail } from "lucide-react";
import { AdminMessagesList } from "@/components/admin/admin-messages-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import type { AdminMessageListResponse, AdminStats, ContactStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact inbox",
  description: "Triage public contact messages.",
};

const STATUSES: ContactStatus[] = ["NEW", "READ", "IN_PROGRESS", "RESOLVED"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/messages");
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const statusParam = single(params.status);
  const status = STATUSES.includes(statusParam as ContactStatus)
    ? (statusParam as ContactStatus)
    : undefined;

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (status) query.set("status", status);

  let data: AdminMessageListResponse | null = null;
  let newCount = 0;
  let loadError: string | null = null;
  try {
    const [messages, stats] = await Promise.all([
      serverApiRequest<AdminMessageListResponse>(`/admin/messages?${query.toString()}`),
      serverApiRequest<AdminStats>("/admin/stats").catch(() => null),
    ]);
    data = messages;
    newCount = stats?.messages.new ?? 0;
  } catch (error) {
    loadError = errorMessage(error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Contact inbox"
        description="Messages submitted through the public contact form. Update a status as you triage each one."
        actions={
          <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
            <Mail className="size-4" />
            Users
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/messages"
          className={cn(
            buttonVariants({ variant: status ? "outline" : "default", size: "sm" }),
            "rounded-full",
          )}
        >
          All
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/messages?status=${value}`}
            className={cn(
              buttonVariants({ variant: status === value ? "default" : "outline", size: "sm" }),
              "rounded-full",
            )}
          >
            {value.replace("_", " ")}
            {value === "NEW" && newCount > 0 ? (
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {newCount}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <form action="/admin/messages" method="get" className="flex items-center gap-2">
            <Select name="status" defaultValue={status ?? ""} aria-label="Filter messages" className="w-44">
              <option value="">All statuses</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {data?.pagination.total ?? 0} {data?.pagination.total === 1 ? "message" : "messages"}
            {status ? ` · ${status.replace("_", " ").toLowerCase()}` : ""}
          </p>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive" title="Could not load messages">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status ? "No messages with that status" : "The inbox is empty"}
          description={
            status
              ? "Try a different status filter."
              : "Messages from the public contact form will appear here."
          }
          action={
            status ? (
              <Link href="/admin/messages" className={buttonVariants({ variant: "outline" })}>
                Clear filter
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <AdminMessagesList initialItems={data.items} />
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            basePath="/admin/messages"
            params={{ status }}
          />
        </>
      ) : null}
    </div>
  );
}
