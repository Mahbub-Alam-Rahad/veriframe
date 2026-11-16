import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, Video as VideoIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ScoreBadge } from "@/components/score-badge";
import { VideoActions } from "@/components/dashboard/video-actions";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { formatBytes, formatDate, formatDuration, formatRelative } from "@/lib/format";
import type { VideoListResponse, VideoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Videos",
  description: "Browse, search and manage your uploaded videos.",
};

const STATUSES: VideoStatus[] = ["UPLOADED", "QUEUED", "PROCESSING", "DONE", "FAILED"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VideosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("/dashboard/videos");
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

  let data: VideoListResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await serverApiRequest<VideoListResponse>(`/videos?${query.toString()}`);
  } catch (error) {
    loadError = errorMessage(error);
  }

  const filtered = Boolean(search || status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Videos"
        description="Every clip you have uploaded, with its analysis state. Media expires automatically according to your plan."
        actions={
          <Link href="/dashboard/analyze" className={buttonVariants()}>
            <VideoIcon className="size-4" />
            Analyze video
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            action="/dashboard/videos"
            method="get"
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search by file name…"
                className="pl-9"
                aria-label="Search videos"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Select
                  name="status"
                  defaultValue={status ?? ""}
                  aria-label="Filter by status"
                  className="w-full pl-9 sm:w-44"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Filter</Button>
              {filtered ? (
                <Link
                  href="/dashboard/videos"
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
          icon={VideoIcon}
          title={filtered ? "No videos match those filters" : "No videos yet"}
          description={
            filtered
              ? "Try a different search term or clear the status filter."
              : "Upload a short clip to get a frame-level analysis, evidence thumbnails and a PDF report."
          }
          action={
            filtered ? (
              <Link href="/dashboard/videos" className={buttonVariants({ variant: "outline" })}>
                Clear filters
              </Link>
            ) : (
              <Link href="/dashboard/analyze" className={buttonVariants()}>
                Analyze your first video
              </Link>
            )
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((video) => (
                  <TableRow key={video.id}>
                    <TableCell className="max-w-[280px]">
                      <Link
                        href={`/dashboard/videos/${video.id}`}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {video.originalName}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Expires {formatDate(video.expiresAt)}
                      </p>
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
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatDuration(video.durationSeconds)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formatBytes(video.sizeBytes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <p>{formatDate(video.createdAt)}</p>
                      <p className="mt-0.5">{formatRelative(video.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <VideoActions
                        videoId={video.id}
                        originalName={video.originalName}
                        status={video.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {data.items.map((video) => (
              <li key={video.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/dashboard/videos/${video.id}`}
                    className="min-w-0 font-medium hover:text-primary"
                  >
                    <span className="line-clamp-2">{video.originalName}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {formatDuration(video.durationSeconds)} · {formatBytes(video.sizeBytes)} ·{" "}
                      {formatRelative(video.createdAt)}
                    </span>
                  </Link>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <VideoStatusBadge status={video.status} />
                    {video.analysis ? <ScoreBadge score={video.analysis.fakeScore} /> : null}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <VideoActions
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
              basePath="/dashboard/videos"
              params={{ search, status }}
            />
          </div>
        </Card>
      ) : null}

      {data && data.items.some((video) => video.status === "FAILED") ? (
        <Alert variant="warning" title="Some analyses failed">
          Open a failed video to read the error and retry it. Repeated failures usually mean an
          unsupported codec or a corrupt file.
        </Alert>
      ) : null}
    </div>
  );
}
