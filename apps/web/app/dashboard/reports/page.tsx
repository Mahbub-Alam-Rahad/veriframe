import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { ScoreBadge, VerdictBadge } from "@/components/score-badge";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE, errorMessage, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { formatDate, formatDateTime, formatDuration } from "@/lib/format";
import type { AnalysisListResponse, Verdict } from "@/lib/types";
import { VERDICTS } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reports",
  description: "Download PDF reports for completed analyses.",
};

const VERDICT_OPTIONS: Verdict[] = ["LIKELY_REAL", "UNCERTAIN", "LIKELY_FAKE"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("/dashboard/reports");
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const verdictParam = single(params.verdict);
  const verdict = VERDICT_OPTIONS.includes(verdictParam as Verdict)
    ? (verdictParam as Verdict)
    : undefined;

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (verdict) query.set("verdict", verdict);

  let data: AnalysisListResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await serverApiRequest<AnalysisListResponse>(`/analyses?${query.toString()}`);
  } catch (error) {
    loadError = errorMessage(error);
  }

  const total = data?.pagination.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Analysis reports"
        description="Every completed analysis can be exported as a PDF with the score, verdict, evidence and limitations."
        actions={
          <Link href="/dashboard/videos" className={buttonVariants({ variant: "outline" })}>
            <FileText className="size-4" />
            Browse videos
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <form action="/dashboard/reports" method="get" className="flex items-center gap-2">
            <Select
              name="verdict"
              defaultValue={verdict ?? ""}
              aria-label="Filter reports by verdict"
              className="w-full sm:w-52"
            >
              <option value="">All verdicts</option>
              {VERDICT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {VERDICTS[value].label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="outline">
              <Search className="size-4" />
              Filter
            </Button>
            {verdict ? (
              <Link
                href="/dashboard/reports"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0")}
              >
                Clear
              </Link>
            ) : null}
          </form>
          <p className="text-xs text-muted-foreground">
            {total} completed {total === 1 ? "analysis" : "analyses"}
          </p>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive" title="Could not load reports">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={verdict ? "No reports match that verdict" : "No reports yet"}
          description={
            verdict
              ? "Try a different verdict filter."
              : "Reports appear here once an analysis completes. Upload a clip to get started."
          }
          action={
            verdict ? (
              <Link href="/dashboard/reports" className={buttonVariants({ variant: "outline" })}>
                Clear filter
              </Link>
            ) : (
              <Link href="/dashboard/analyze" className={buttonVariants()}>
                Analyze a video
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
                  <TableHead>Verdict</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Frames</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Analyzed</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell className="max-w-[260px]">
                      <Link
                        href={`/dashboard/videos/${analysis.video.id}`}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {analysis.video.originalName}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDuration(analysis.video.durationSeconds)} ·{" "}
                        {formatDate(analysis.video.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={analysis.verdict} />
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={analysis.fakeScore} />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {analysis.framesAnalyzed}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                      {analysis.modelName} {analysis.modelVersion}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(analysis.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <a
                          href={`${API_BASE}/analyses/${analysis.id}/report`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Download className="size-3.5" />
                          PDF
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {data.items.map((analysis) => (
              <li key={analysis.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/dashboard/videos/${analysis.video.id}`}
                    className="min-w-0 font-medium hover:text-primary"
                  >
                    <span className="line-clamp-2">{analysis.video.originalName}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {formatDate(analysis.createdAt)}
                    </span>
                  </Link>
                  <ScoreBadge score={analysis.fakeScore} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <VerdictBadge verdict={analysis.verdict} />
                  <a
                    href={`${API_BASE}/analyses/${analysis.id}/report`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <Download className="size-3.5" />
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-4">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              basePath="/dashboard/reports"
              params={{ verdict }}
            />
          </div>
        </Card>
      ) : null}

      <Alert variant="info" title="About the PDF report">
        Reports include the video metadata, aggregate score, verdict, frame timeline and the
        limitations of automated detection. The report is generated on demand and never leaves this
        deployment.
      </Alert>
    </div>
  );
}
