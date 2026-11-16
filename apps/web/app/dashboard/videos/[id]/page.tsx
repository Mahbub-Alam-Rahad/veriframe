import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  FileVideo,
  Fingerprint,
  Film,
  Gauge,
  Layers,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { EvidenceGallery } from "@/components/dashboard/evidence-gallery";
import { FrameTimeline } from "@/components/frame-timeline";
import { PageHeader } from "@/components/page-header";
import { ScoreGauge } from "@/components/score-gauge";
import { VerdictBadge } from "@/components/score-badge";
import { VideoActions } from "@/components/dashboard/video-actions";
import { VideoProcessingWatcher } from "@/components/dashboard/video-processing-watcher";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, API_BASE, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatDuration,
  formatRelative,
  titleCase,
} from "@/lib/format";
import type { Video } from "@/lib/types";
import { DISCLAIMER, scoreTone, verdictMeta } from "@/lib/verdicts";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Video analysis",
    description: `Analysis details for video ${id.slice(0, 8)}.`,
  };
}

export default async function VideoDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  await requireUser(`/dashboard/videos/${id}`);

  let video: Video;
  try {
    video = await serverApiRequest<Video>(`/videos/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const analysis = video.analysis;
  const details = analysis?.details ?? null;
  const warnings = Array.isArray(details?.warnings)
    ? (details.warnings as string[]).filter((warning) => typeof warning === "string")
    : [];
  const tone = analysis ? scoreTone(analysis.fakeScore) : "warning";
  const meta = analysis ? verdictMeta(analysis.verdict) : null;
  const isWorking = ["UPLOADED", "QUEUED", "PROCESSING"].includes(video.status);
  const reportHref = analysis ? `${API_BASE}/analyses/${analysis.id}/report` : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/videos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to videos
        </Link>
      </div>

      <PageHeader
        eyebrow="Analysis result"
        title={video.originalName}
        description={`Uploaded ${formatDateTime(video.createdAt)} · ${formatBytes(video.sizeBytes)} · ${formatDuration(video.durationSeconds)}`}
        actions={
          <>
            {reportHref ? (
              <a href={reportHref} className={buttonVariants({ variant: "outline" })}>
                <Download className="size-4" />
                Download PDF
              </a>
            ) : null}
            <VideoActions
              videoId={video.id}
              originalName={video.originalName}
              status={video.status}
              redirectTo={video.status === "FAILED" ? undefined : "/dashboard/videos"}
            />
          </>
        }
      />

      {video.status === "FAILED" ? (
        <Alert variant="destructive" title="Analysis failed">
          <p>{video.error ?? "The worker could not complete this analysis."}</p>
          <p className="mt-2 text-xs">
            Retry with the refresh button above. If it keeps failing, check that the file plays
            correctly and that the ML service is healthy.
          </p>
        </Alert>
      ) : null}

      {!analysis && isWorking ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanLine className="size-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              {video.status === "PROCESSING" ? "Analyzing frames" : "Waiting for a worker"}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Frames are sampled and scored on the analysis worker. On CPU-only hardware a longer
              clip can take a few minutes. This page refreshes automatically.
            </p>
            <div className="mt-4">
              <VideoStatusBadge status={video.status} />
            </div>
            <div className="mt-5">
              <VideoProcessingWatcher videoId={video.id} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {analysis ? (
        <>
          {details?.mock ? (
            <Alert variant="warning" title="Mock model — demonstration output">
              This deployment is running the deterministic mock backend. Scores are generated by a
              placeholder model to exercise the pipeline and are <strong>not real detection results</strong>.
              Set <code className="font-mono text-xs">MODEL_BACKEND=hf</code> and restart the ML
              service to use the configured Hugging Face model.
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <Card className="overflow-hidden">
              <CardContent className="grid gap-6 p-6 sm:grid-cols-[240px_1fr] sm:items-center">
                <ScoreGauge
                  score={analysis.fakeScore}
                  verdict={analysis.verdict}
                  confidence={analysis.confidence}
                  className="mx-auto"
                />
                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerdictBadge verdict={analysis.verdict} />
                    <VideoStatusBadge status={video.status} />
                    <Badge variant="outline">{titleCase(analysis.backend)} backend</Badge>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">{meta?.label}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {meta?.description}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Fake probability
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {(analysis.fakeProbability * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Confidence
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {(analysis.confidence * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Frames scored
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">{analysis.framesAnalyzed}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Faces found
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">{analysis.facesDetected}</dd>
                    </div>
                  </dl>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      Analyzed {formatDateTime(analysis.createdAt)} with{" "}
                      <span className="font-medium text-foreground">
                        {analysis.modelName} · {analysis.modelVersion}
                      </span>
                      {details?.processingMs
                        ? ` in ${(Number(details.processingMs) / 1000).toFixed(1)} s`
                        : ""}
                      .
                    </p>
                    {details?.aggregation ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Aggregation: {String(details.aggregation)}.
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What to do next</CardTitle>
                <CardDescription>Use the score as a signal, not a conclusion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    icon: FileVideo,
                    title: "Review the source",
                    body: "Check where the clip was published, who uploaded it and whether the original file is available.",
                  },
                  {
                    icon: Layers,
                    title: "Compare the evidence",
                    body: "Look at the highest-scoring frames and the timeline around them. Isolated spikes can be misleading.",
                  },
                  {
                    icon: ShieldAlert,
                    title: "Corroborate",
                    body: "Combine this result with reverse image search, provenance tooling and human review before acting.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-lg border border-border p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
                {reportHref ? (
                  <a
                    href={reportHref}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
                  >
                    <Download className="size-3.5" />
                    Download the PDF report
                  </a>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {warnings.length > 0 ? (
            <Alert variant="warning" title="Analysis warnings">
              <ul className="list-disc space-y-1 pl-4">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Frame-level timeline</CardTitle>
                <CardDescription>
                  Fake score for each sampled frame. Background bands mark the verdict thresholds.
                </CardDescription>
              </div>
              <Badge variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"}>
                mean {analysis.fakeScore} / 100
              </Badge>
            </CardHeader>
            <CardContent>
              <FrameTimeline frames={analysis.frameScores ?? []} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <CardHeader>
                <CardTitle>Evidence frames</CardTitle>
                <CardDescription>
                  The highest-scoring sampled frames with the detected face box. Click a frame to
                  enlarge it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EvidenceGallery frames={analysis.flaggedFrames} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Media details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    {[
                      ["File name", video.originalName],
                      ["MIME type", video.mimeType],
                      ["Size", formatBytes(video.sizeBytes)],
                      ["Duration", formatDuration(video.durationSeconds)],
                      [
                        "Dimensions",
                        video.width && video.height ? `${video.width} × ${video.height}` : "—",
                      ],
                      ["Uploaded", formatDateTime(video.createdAt)],
                      ["Expires", `${formatDate(video.expiresAt)} (${formatRelative(video.expiresAt)})`],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <dt className="shrink-0 text-muted-foreground">{label}</dt>
                        <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pipeline</CardTitle>
                  <CardDescription>Recorded by the analysis run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[
                    { icon: Cpu, label: "Backend", value: titleCase(analysis.backend) },
                    { icon: Sparkles, label: "Model", value: `${analysis.modelName} ${analysis.modelVersion}` },
                    { icon: Film, label: "Sample rate", value: details?.sampleFps ? `${details.sampleFps} fps` : "—" },
                    { icon: Gauge, label: "Temporal score", value: analysis.temporalScore === null ? "—" : `${Math.round(analysis.temporalScore)} / 100` },
                    { icon: Fingerprint, label: "Analysis ID", value: analysis.id.slice(0, 12) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <item.icon className="size-3.5" />
                        {item.label}
                      </span>
                      <span className="min-w-0 truncate font-medium">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <Clock3 className="mt-0.5 size-3.5 shrink-0" />
                Media, evidence thumbnails and the signed URLs on this page expire automatically.
                Download the report if you need a durable record.
              </div>
            </div>
          </div>

          <Alert variant="warning" title="Scores are probabilistic, not proof" icon>
            {DISCLAIMER}
          </Alert>
        </>
      ) : null}

      {!analysis && !isWorking ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {video.status === "FAILED" ? (
              <AlertTriangle className="size-8 text-amber-500" />
            ) : (
              <CheckCircle2 className="size-8 text-muted-foreground" />
            )}
            <p className="mt-3 text-sm font-medium">No analysis is available for this video</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Re-run the analysis to generate a result. The original upload remains available until
              its retention date.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
