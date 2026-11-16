import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { formatDateTime, formatRelative, titleCase } from "@/lib/format";
import type { AuditListResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit log",
  description: "Review privileged actions across the deployment.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/audit");
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const action = single(params.action)?.trim() ?? "";

  const query = new URLSearchParams({ page: String(page), pageSize: "30" });
  if (action) query.set("action", action);

  let data: AuditListResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await serverApiRequest<AuditListResponse>(`/admin/audit?${query.toString()}`);
  } catch (error) {
    loadError = errorMessage(error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Append-only record of authentication, uploads, API keys, plan changes and admin actions."
        actions={
          <Link href="/admin/system" className={buttonVariants({ variant: "outline" })}>
            <ShieldCheck className="size-4" />
            System health
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form action="/admin/audit" method="get" className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="action"
                defaultValue={action}
                placeholder="Filter by action, e.g. admin.user_updated"
                className="pl-9"
                aria-label="Filter audit actions"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="outline">
                Filter
              </Button>
              {action ? (
                <Link
                  href="/admin/audit"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive" title="Could not load the audit log">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No audit entries match"
          description="Try a different action filter. Entries appear as soon as privileged actions occur."
          action={
            action ? (
              <Link href="/admin/audit" className={buttonVariants({ variant: "outline" })}>
                Clear filter
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <p>{formatDateTime(entry.createdAt)}</p>
                      <p className="mt-0.5">{formatRelative(entry.createdAt)}</p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {entry.actor ? (
                        <>
                          <p className="truncate text-sm">{entry.actor.name ?? entry.actor.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.actor.email}</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{titleCase(entry.action.replaceAll(".", " · "))}</Badge>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{entry.action}</p>
                    </TableCell>
                    <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                      {entry.targetType ? (
                        <>
                          <p>{entry.targetType}</p>
                          <p className="mt-0.5 truncate font-mono">{entry.targetId}</p>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {entry.ip ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      {entry.metadata ? (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            View metadata
                          </summary>
                          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-muted/30 p-2 text-[11px] leading-relaxed">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {data.items.map((entry) => (
              <li key={entry.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.actor?.email ?? "System"}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{entry.action}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(entry.createdAt)}
                  </span>
                </div>
                {entry.metadata ? (
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                      View metadata
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-muted/30 p-2 text-[11px]">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-4">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              basePath="/admin/audit"
              params={{ action }}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
