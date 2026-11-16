"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileVideo,
  Film,
  Lock,
  RefreshCw,
  ScanLine,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, Spinner } from "@/components/ui/progress";
import { API_BASE, ApiError, apiRequest, errorMessage } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Video } from "@/lib/types";
import { DISCLAIMER } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "m4v"];
const ACCEPTED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-m4v",
]);

type Phase = "idle" | "selected" | "uploading" | "polling" | "failed";

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<Video> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/videos`);
    xhr.withCredentials = true;
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Video);
        return;
      }
      const body = xhr.response as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message)
        ? body.message.join(" ")
        : body?.message || `Upload failed with status ${xhr.status}`;
      reject(new ApiError(message, xhr.status, body ?? undefined));
    };

    xhr.onerror = () => reject(new ApiError("Network error while uploading the video", 0));
    xhr.ontimeout = () => reject(new ApiError("The upload timed out", 0));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 8000);
    video.src = url;
  });
}

export function AnalyzeWorkspace({
  maxUploadBytes,
  maxVideoSeconds,
  remaining,
  emailVerified,
  retentionDays,
}: {
  maxUploadBytes: number;
  maxVideoSeconds: number;
  remaining: number;
  emailVerified: boolean;
  retentionDays: number;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [video, setVideo] = React.useState<Video | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [probing, setProbing] = React.useState(false);
  const redirected = React.useRef(false);

  const blocked = !emailVerified || remaining <= 0;

  const polling = useQuery({
    queryKey: ["analysis-video", video?.id],
    queryFn: () => apiRequest<Video>(`/videos/${video?.id}`),
    enabled: Boolean(video?.id) && (phase === "polling" || phase === "uploading"),
    refetchInterval: (query) => {
      const data = query.state.data as Video | undefined;
      if (!data) return 2500;
      return ["UPLOADED", "QUEUED", "PROCESSING"].includes(data.status) ? 2500 : false;
    },
  });

  const current = polling.data ?? video;

  React.useEffect(() => {
    if (!current) return;
    if (current.status === "FAILED") {
      setPhase("failed");
      setError(current.error ?? "The analysis failed. Try a different file or retry from the videos page.");
    }
    if (current.status === "DONE" && !redirected.current) {
      redirected.current = true;
      setPhase("polling");
      toast.success("Analysis complete");
      const timeout = window.setTimeout(() => {
        router.push(`/dashboard/videos/${current.id}`);
        router.refresh();
      }, 700);
      return () => window.clearTimeout(timeout);
    }
  }, [current, router]);

  async function chooseFile(next: File | null | undefined) {
    if (!next) return;
    setError(null);
    setVideo(null);
    setProgress(0);

    if (blocked) {
      setError(
        !emailVerified
          ? "Verify your email address before uploading videos."
          : "You have reached your monthly analysis limit.",
      );
      return;
    }

    const ext = extensionOf(next.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_MIME.has(next.type)) {
      setError("Choose an MP4, MOV, WebM, MKV or M4V video.");
      return;
    }
    if (next.size <= 0) {
      setError("The selected file is empty.");
      return;
    }
    if (next.size > maxUploadBytes) {
      setError(
        `This file is ${formatBytes(next.size)}. Your plan allows up to ${formatBytes(maxUploadBytes)} per upload.`,
      );
      return;
    }

    setFile(next);
    setPhase("selected");
    setProbing(true);
    const detected = await readDuration(next);
    setDuration(detected);
    setProbing(false);

    if (detected !== null && detected > maxVideoSeconds + 0.5) {
      setError(
        `This clip is ${formatDuration(detected)}. Your plan allows up to ${formatDuration(maxVideoSeconds)} per video.`,
      );
    }
  }

  function reset() {
    setFile(null);
    setDuration(null);
    setPhase("idle");
    setProgress(0);
    setVideo(null);
    setError(null);
    setProbing(false);
    redirected.current = false;
    if (inputRef.current) inputRef.current.value = "";
  }

  async function startUpload() {
    if (!file || error) return;
    setPhase("uploading");
    setProgress(0);
    try {
      const created = await uploadVideo(file, setProgress);
      setVideo(created);
      setPhase("polling");
      toast.success("Upload received — analysis queued");
    } catch (uploadError) {
      setPhase("failed");
      setError(errorMessage(uploadError));
      toast.error(errorMessage(uploadError));
    }
  }

  const isWorking = phase === "uploading" || phase === "polling";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-6">
        {blocked ? (
          <Alert variant={remaining <= 0 ? "destructive" : "warning"} title="Uploads are paused">
            {!emailVerified
              ? "Confirm your email address to upload videos. Use the banner above to resend the verification link."
              : "You have used all analyses for this month. Your allowance resets on the first of the next month (UTC), or an administrator can raise your plan."}
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Upload a video</CardTitle>
            <CardDescription>
              Up to {formatBytes(maxUploadBytes)} and {formatDuration(maxVideoSeconds)} per clip on
              your current plan. Files are processed on this deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {phase === "idle" || phase === "selected" ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !blocked && inputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!blocked) inputRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!blocked) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!blocked) void chooseFile(event.dataTransfer.files?.[0]);
                  }}
                  aria-disabled={blocked}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-accent/40",
                    blocked && "cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/20",
                  )}
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="size-7" />
                  </span>
                  <p className="mt-4 text-sm font-semibold">
                    Drop a video here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    MP4, MOV, WebM, MKV or M4V · max {formatBytes(maxUploadBytes)}
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".mp4,.mov,.webm,.mkv,.m4v,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-m4v"
                    className="sr-only"
                    onChange={(event) => void chooseFile(event.target.files?.[0])}
                    disabled={blocked}
                  />
                </div>

                {file ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                          <FileVideo className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{file.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatBytes(file.size)}
                            {probing
                              ? " · reading duration…"
                              : duration !== null
                                ? ` · ${formatDuration(duration)}`
                                : " · duration checked on upload"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={reset}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Remove selected file"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {error ? (
                      <Alert variant="destructive" className="mt-4">
                        {error}
                      </Alert>
                    ) : (
                      <Button
                        type="button"
                        onClick={startUpload}
                        disabled={probing || Boolean(error) || blocked}
                        className="mt-4 w-full sm:w-auto"
                      >
                        <ScanLine className="size-4" />
                        Start analysis
                      </Button>
                    )}
                  </div>
                ) : error ? (
                  <Alert variant="destructive">{error}</Alert>
                ) : null}
              </>
            ) : null}

            {phase === "uploading" ? (
              <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="size-6" />
                </span>
                <p className="mt-4 text-sm font-semibold">Uploading securely</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{file?.name}</p>
                <Progress value={progress} className="mt-5" label="Upload progress" />
                <p className="mt-2 text-xs font-medium tabular-nums text-muted-foreground">
                  {progress}% · {formatBytes((file?.size ?? 0) * (progress / 100))} of{" "}
                  {formatBytes(file?.size ?? 0)}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Keep this tab open until the upload finishes. Analysis continues on the worker.
                </p>
              </div>
            ) : null}

            {phase === "polling" ? (
              <div className="rounded-xl border border-border bg-muted/20 p-6">
                <div className="flex flex-col items-center text-center">
                  <span className="relative flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/20" />
                    <ScanLine className="relative size-6" />
                  </span>
                  <p className="mt-4 text-sm font-semibold">
                    {current?.status === "PROCESSING" ? "Analyzing frames" : "Waiting for a worker"}
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Sampling frames, detecting faces and scoring crops. Long clips can take a few
                    minutes on CPU. You can leave this page — the job continues.
                  </p>
                </div>

                <div className="mt-6 space-y-2">
                  {[
                    { label: "Upload and validation", done: true },
                    {
                      label: "Frame sampling and face detection",
                      done: current?.status === "PROCESSING",
                      active: current?.status === "PROCESSING",
                    },
                    {
                      label: "Model scoring and aggregation",
                      done: current?.status === "PROCESSING",
                      active: current?.status === "PROCESSING",
                    },
                    { label: "Evidence and result", done: false },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-3 text-sm">
                      {step.done ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : step.active ? (
                        <Spinner className="size-4" />
                      ) : (
                        <span className="size-4 rounded-full border border-border" />
                      )}
                      <span className={cn("text-muted-foreground", step.done && "text-foreground")}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-primary to-transparent bg-[length:200%_100%]" />
                </div>

                <div className="mt-5 flex justify-center">
                  <LinkLike href="/dashboard/videos" label="View all videos" />
                </div>
              </div>
            ) : null}

            {phase === "failed" ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-6 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-6" />
                </span>
                <p className="mt-4 text-sm font-semibold">Analysis did not complete</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {error ?? "The job failed. Check the video format or retry from the videos page."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {video ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await apiRequest(`/videos/${video.id}/retry`, { method: "POST" });
                          setError(null);
                          setPhase("polling");
                          await polling.refetch();
                        } catch (retryError) {
                          toast.error(errorMessage(retryError));
                        }
                      }}
                    >
                      <RefreshCw className="size-4" />
                      Retry job
                    </Button>
                  ) : null}
                  <Button type="button" onClick={reset}>
                    Choose another file
                  </Button>
                  <LinkLike href="/dashboard/videos" label="Open videos" />
                </div>
              </div>
            ) : null}

            {isWorking ? (
              <p className="text-center text-xs text-muted-foreground">
                By uploading, you confirm you have permission to process this media.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Lock,
              title: "Private storage",
              body: "Uploaded with ownership checks and served through short-lived signed URLs.",
            },
            {
              icon: Clock3,
              title: `${retentionDays}-day retention`,
              body: "Media and thumbnails expire automatically according to your plan.",
            },
            {
              icon: Film,
              title: "CPU-friendly",
              body: "Frames are sampled rather than fully decoded to keep CPU analysis practical.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-4">
              <item.icon className="size-4 text-primary" />
              <p className="mt-2 text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>What we check</CardTitle>
            <CardDescription>The pipeline records each signal with the result.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                ["Validate", "File signature, size and duration are checked before anything is stored."],
                ["Sample", "Frames are sampled at a configurable rate across the whole clip."],
                ["Crop", "Faces are detected and cropped; centre crops are used as a fallback."],
                ["Score", "Each crop is scored by the active model and aggregated with temporal signals."],
                ["Review", "You get a timeline, ranked evidence frames and a downloadable report."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Alert variant="warning" title="A score is not proof">
          {DISCLAIMER}
        </Alert>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Your limits</p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Upload size</dt>
              <dd className="font-medium">{formatBytes(maxUploadBytes)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Clip length</dt>
              <dd className="font-medium">{formatDuration(maxVideoSeconds)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Analyses left</dt>
              <dd className="font-medium">{remaining}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Retention</dt>
              <dd className="font-medium">{retentionDays} days</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function LinkLike({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      {label}
      <ArrowRight className="size-3.5" />
    </a>
  );
}
