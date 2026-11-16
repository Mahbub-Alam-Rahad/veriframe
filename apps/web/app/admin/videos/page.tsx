import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search, Video } from "lucide-react";
import { AdminVideoActions } from "@/components/admin/admin-video-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ScoreBadge } from "@/components/score-badge";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE, errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { formatBytes, formatDate, formatDuration, formatRelative } from "@/lib/format";
import type { AdminVideoListResponse, VideoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin videos",
  description: "Review and manage every uploaded video.",
};

const STATUSES: VideoStatus[] = ["UPLOADED", "QUEUED", "PROCESSING", "DONE", "FAILED"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminVideosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/videos");
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const search = single(params.search)?.trim() ?? "";
  const statusParam = single(params.status);
  const status = STATUSES.includes(statusParam as VideoStatus)
    ? (statusParam as VideoStatus)
    : undefined;

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) query.set("search", search);
  if (status) query.set("status", status);

  let data: AdminVideoListResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await serverApiRequest<AdminVideoListResponse>(`/admin/videos?${query.toString()}`);
  } catch (error) {
    loadError = errorMessage(error);
  }

  const filtered = Boolean(search || status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Videos"
        description="Every upload across the deployment, with owner, status, score and report access."
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            action="/admin/videos"
            method="get"
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search file name or owner email…"
                className="pl-9"
                aria-label="Search videos"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select name="status" defaultValue={status ?? ""} aria-label="Filter by status" className="sm:w-44">
                <option value="">All statuses</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
              <Button type="submit">Filter</Button>
              {filtered ? (
                <Link
                  href="/admin/videos"
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
        <Alert variant="destructive" title="Could not load videos">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={Video}
          title={filtered ? "No videos match those filters" : "No videos have been uploaded"}
          description={
            filtered
              ? "Try a different search or clear the status filter."
              : "Uploads from all users will appear here."
          }
          action={
            filtered ? (
              <Link href="/admin/videos" className={buttonVariants({ variant: "outline" })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="max-w-[260px]">
                      <p className="truncate font-medium">{video.originalName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {video.mimeType} · {formatDuration(video.durationSeconds)}
                      </p>
                      {video.error ? (
                        <p className="mt-1 line-clamp-1 text-xs text-rose-600 dark:text-rose-400">
                          {video.error}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">{video.user.name ?? video.user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{video.user.email}</p>
                    </TableCell>
                    <TableCell>
                      <VideoStatusBadge status={video.status} />
                    </TableCell>
                    <TableCell>
                      {video.analysis ? (
                        <ScoreBadge score={video.analysis.fakeScore} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <p>{formatBytes(video.sizeBytes)}</p>
                      <p className="mt-0.5">
                        {video.width && video.height ? `${video.width}×${video.height}` : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <p>{formatDate(video.createdAt)}</p>
                      <p className="mt-0.5">{formatRelative(video.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {video.analysis ? (
                          <a
                            href={`${API_BASE}/admin/analyses/${video.analysis.id}/report`}
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                            aria-label={`Download report for ${video.originalName}`}
                            title="Download PDF report"
                          >
                            <Download className="size-3.5" />
                          </a>
                        ) : null}
                        <AdminVideoActions
                          videoId={video.id}
                          originalName={video.originalName}
                          status={video.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border xl:hidden">
            {data.items.map((video) => (
              <li key={video.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{video.originalName}</p>
                    <p className="truncate text-xs text-muted-foreground">{video.user.email}</p>
                  </div>
                  <VideoStatusBadge status={video.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatBytes(video.sizeBytes)}</span>
                  <span>{formatDuration(video.durationSeconds)}</span>
                  <span>{formatRelative(video.createdAt)}</span>
                  {video.analysis ? <ScoreBadge score={video.analysis.fakeScore} /> : null}
                </div>
                <div className="flex items-center justify-between gap-2">
                  {video.analysis ? (
                    <a
                      href={`${API_BASE}/admin/analyses/${video.analysis.id}/report`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Download className="size-3.5" />
                      PDF
                    </a>
                  ) : (
                    <span />
                  )}
                  <AdminVideoActions
                    videoId={video.id}
                    originalName={video.originalName}
                    status={video.status}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-4">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              basePath="/admin/videos"
              params={{ search, status }}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
