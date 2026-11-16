import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  ScanFace,
  ShieldAlert,
  Sparkles,
  Timer,
} from "lucide-react";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { CtaBand } from "@/components/marketing/cta-band";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Explore the VeriFrame pipeline: secure uploads, face-aware frame sampling, temporal scoring, evidence review, model registry and a documented API.",
};

const PIPELINE = [
  {
    icon: Lock,
    step: "01",
    title: "Intake and validation",
    body: "The API checks content type, file signature, size and duration against the account plan. Media is written to private S3-compatible storage with a random key.",
  },
  {
    icon: Timer,
    step: "02",
    title: "Queue and isolate",
    body: "A BullMQ job is created. The worker downloads the object into a temporary directory, invokes the private ML service and never exposes model credentials to the browser.",
  },
  {
    icon: ScanFace,
    step: "03",
    title: "Sample and crop",
    body: "Frames are sampled at a configurable rate. Face detection crops the subject with a transparent centre-crop fallback when no face is found.",
  },
  {
    icon: Gauge,
    step: "04",
    title: "Score and aggregate",
    body: "A frame classifier returns a probability per crop. The pipeline calibrates the result, aggregates the top frames and blends a temporal instability signal.",
  },
  {
    icon: FileText,
    step: "05",
    title: "Persist evidence",
    body: "Scores, face boxes, ranked evidence thumbnails, model metadata and calibration settings are stored with the analysis for later review.",
  },
];

export default function ProductPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
        <div className="container relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="size-3" />
              The VeriFrame pipeline
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              A media verification workflow you can inspect.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Every stage is explicit: what was uploaded, which frames were sampled, what the model
              saw and how the score was produced. No hidden hosted inference.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Try it free
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/docs" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Developer docs
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="container py-16 sm:py-24" id="pipeline">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pipeline</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Five stages, each with a clear boundary.
          </h2>
          <p className="mt-4 text-muted-foreground">
            The web app never talks to the model. The API owns authorization and persistence. The
            worker orchestrates. The ML service is private and token-protected.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          {PIPELINE.map((item) => (
            <div key={item.step} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground/50 tabular-nums">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24" id="evidence">
        <div className="container grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A score you can interrogate.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The result view combines a fake score, verdict band, frame timeline and ranked
              evidence thumbnails. You can see whether the classifier actually found faces and
              which moments were most suspicious.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Frame timeline with score bands and sampled timestamps",
                "Ranked face crops with face boxes where detection succeeded",
                "Temporal score and frame-to-frame instability signal",
                "Model name, version, backend and calibration temperature",
                "Warnings when no faces were found or a mock backend is active",
                "Downloadable PDF report with limitations included",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-xs font-medium text-muted-foreground">Analysis detail</p>
              <Badge variant="danger">Likely manipulated</Badge>
            </div>
            <div className="space-y-4 p-5">
              {[
                { label: "Fake score", value: "82 / 100", width: "82%", tone: "bg-rose-500" },
                { label: "Confidence", value: "91.4%", width: "91%", tone: "bg-primary" },
                { label: "Temporal instability", value: "77.2%", width: "77%", tone: "bg-amber-500" },
                { label: "Face coverage", value: "94%", width: "94%", tone: "bg-emerald-500" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold tabular-nums">{row.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", row.tone)} style={{ width: row.width }} />
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Model</p>
                <p className="mt-1 text-xs font-medium">
                  frame-classifier · v1.0.0 · HF backend · CPU
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Aggregation: top 30% frames, calibrated, blended with temporal instability
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24" id="models">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Models</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Swap the detector without rewriting the product.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The ML service exposes a backend contract. The app ships with a Hugging Face
              frame-classifier backend and a deterministic mock backend for development. Register
              a model version in the admin console, record its calibration and activate it for new
              analyses.
            </p>
            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
              The mock backend exists so the stack can be exercised without downloading weights. It
              is explicitly labelled and must never be presented as a trained detection result.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Layers,
                title: "Versioned registry",
                body: "Track name, version, model ID, backend, calibration temperature and notes for every checkpoint.",
              },
              {
                icon: LineChart,
                title: "Calibration-aware",
                body: "Raw model outputs pass through a temperature-scaled calibration step before being surfaced as a probability.",
              },
              {
                icon: ShieldAlert,
                title: "Uncertainty first",
                body: "Verdict bands make room for inconclusive results instead of forcing every clip into real or fake.",
              },
              {
                icon: KeyRound,
                title: "Private inference",
                body: "The ML service requires an internal token and is not published through the public web edge.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24" id="api">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">API</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Automate the workflow when the volume grows.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pro and Enterprise plans can create hashed API keys and use the public video
              endpoints. Upload a file, poll the video, retrieve the analysis and delete the media
              when your retention window closes.
            </p>
            <Link href="/docs#quickstart" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
              API quickstart
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
              <span className="size-2 rounded-full bg-rose-400" />
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="size-2 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[11px] text-slate-400">upload-and-poll.sh</span>
            </div>
            <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-slate-300">
              <code>{`curl -X POST "$APP_URL/api/v1/public/v1/videos" \\
  -H "x-api-key: $VERIFRAME_API_KEY" \\
  -F "file=@interview.mp4"

# → { "id": "vid_…", "status": "QUEUED", … }

curl "$APP_URL/api/v1/public/v1/videos/vid_…" \\
  -H "x-api-key: $VERIFRAME_API_KEY"

# → analysis.fakeScore, verdict, frameScores, flaggedFrames`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Limitations
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Read this before you rely on a score.</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>{DISCLAIMER}</p>
              <p>
                Frame-level classifiers can be sensitive to compression, lighting, occlusion,
                makeup, resolution and the generator family used. A low score does not certify
                authenticity. A high score does not establish intent or prove who created the
                media.
              </p>
              <p>
                Keep the model version, calibration data and evaluation notes with your case file.
                Re-evaluate the model when your source mix or threat model changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
