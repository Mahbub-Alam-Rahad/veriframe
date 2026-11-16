import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Braces,
  Building2,
  CheckCircle2,
  Clock3,
  Cpu,
  Eye,
  FileSearch,
  Fingerprint,
  Gauge,
  Layers,
  Lock,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Waves,
} from "lucide-react";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "VeriFrame — Self-hosted deepfake detection",
  description:
    "Upload a video, inspect frame-level manipulation signals and export an evidence report. Self-hosted, CPU-first and honest about uncertainty.",
};

const STEPS = [
  {
    icon: Video,
    title: "Upload securely",
    description:
      "Videos are validated, stored in your object storage and processed under your retention policy.",
  },
  {
    icon: ScanFace,
    title: "Sample & crop",
    description:
      "Frames are sampled across the clip. Faces are detected and cropped so the classifier sees the region that matters.",
  },
  {
    icon: Waves,
    title: "Score each frame",
    description:
      "A frame-level model scores each crop. Results are aggregated with a temporal consistency signal.",
  },
  {
    icon: FileSearch,
    title: "Review & report",
    description:
      "Inspect the timeline, flagged frames and model metadata, then export a PDF for your case file.",
  },
];

const FEATURES = [
  {
    icon: Gauge,
    title: "Frame-level evidence",
    description:
      "See exactly which moments drove the score instead of accepting a single opaque number.",
  },
  {
    icon: ScanFace,
    title: "Face-aware pipeline",
    description:
      "Haar face detection crops the subject before scoring, with a transparent fallback to centre crops.",
  },
  {
    icon: Waves,
    title: "Temporal signals",
    description:
      "Flicker and frame-to-frame instability are blended with the visual score to surface suspicious sequences.",
  },
  {
    icon: Layers,
    title: "Model registry",
    description:
      "Register model versions, record calibration settings and switch the active model without code changes.",
  },
  {
    icon: Braces,
    title: "API-first workflow",
    description:
      "Upload, poll and retrieve results over a documented REST API with scoped API keys and rate limits.",
  },
  {
    icon: Lock,
    title: "Your infrastructure",
    description:
      "No hosted inference. Media, scores and reports stay inside the environment you control.",
  },
];

const LIMITATIONS = [
  {
    title: "Calibration is not certification",
    body: "Scores come from a statistical model. They must be calibrated against representative data and reviewed by a human before they inform a decision.",
  },
  {
    title: "Novel generators move the target",
    body: "A detector trained on yesterday's generators may miss tomorrow's. Track model performance and re-evaluate regularly.",
  },
  {
    title: "Compression changes signals",
    body: "Re-encoding, low light, occlusion, motion blur and heavy editing can all shift frame scores in either direction.",
  },
  {
    title: "No audio verdict by default",
    body: "The default pipeline evaluates frames only. Audio analysis is a separate capability and is not implied by the score.",
  },
];

const FAQS = [
  {
    question: "Is this a hosted service?",
    answer:
      "No. VeriFrame is designed to be self-hosted with Docker Compose. The API, worker, ML service, database, queue and object storage all run in your environment. There is no third-party inference call.",
  },
  {
    question: "How accurate is the detector?",
    answer:
      "We do not publish a generic accuracy claim because performance depends on the model checkpoint, calibration data, generator family, compression and the faces in the clip. Evaluate the active model on your own labelled samples and treat scores as one signal among several.",
  },
  {
    question: "Does it run without a GPU?",
    answer:
      "Yes. The default deployment is CPU-first and is tuned for modest hardware using sampled frames and serialized analyses. A GPU can be used by changing the model device, but training is not part of the application runtime.",
  },
  {
    question: "What happens to uploaded videos?",
    answer:
      "They are stored in your S3-compatible storage, processed by your worker and deleted according to your plan and retention settings. Operators can configure a global retention ceiling and run scheduled cleanup.",
  },
  {
    question: "Can I replace the model?",
    answer:
      "Yes. The ML service exposes a backend interface with Hugging Face and mock implementations. You can add a backend, register the model version in the admin console and activate it for new analyses.",
  },
  {
    question: "Is the result proof of manipulation?",
    answer:
      "No. A high score is a probabilistic signal, not forensic proof. VeriFrame reports uncertainty, model metadata and the limitations alongside the score so results are not overread.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" aria-hidden="true" />
        <div className="container relative grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-24">
          <div className="animate-fade-up">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="size-3" />
              Self-hosted media forensics
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[58px] lg:leading-[1.04]">
              Know what the <span className="gradient-text">video</span> is really made of.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              VeriFrame analyzes video for signs of manipulation, shows the frames that drove the
              result and gives your team an evidence trail — all on infrastructure you control.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Analyze a video
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/product" className={buttonVariants({ variant: "outline", size: "lg" })}>
                See how it works
              </Link>
            </div>

            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              {["No third-party inference", "Frame-level evidence", "CPU-first deployment"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="animate-fade-up lg:pl-4" style={{ animationDelay: "120ms" }}>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20">
        <div className="container grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building2, value: "100%", label: "Self-hosted processing" },
            { icon: Eye, value: "Frame-level", label: "Evidence you can inspect" },
            { icon: ShieldCheck, value: "RBAC", label: "Roles, ownership and audit logs" },
            { icon: Cpu, value: "CPU-first", label: "Runs on modest hardware" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            The problem
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A convincing clip is no longer evidence on its own.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Synthetic video is cheap to produce and hard to spot at a glance. Trust teams need a
            repeatable process that records what was checked, what the model saw and where the
            result is uncertain.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Fingerprint,
              title: "Attribution is hard",
              body: "A polished clip can spread faster than the verification workflow behind it. Screenshots and gut feeling do not scale.",
            },
            {
              icon: Gauge,
              title: "Black boxes erode trust",
              body: "A single confidence number, with no frames or model metadata, is difficult to defend in an editorial or legal review.",
            },
            {
              icon: Layers,
              title: "Evidence must travel",
              body: "The analysis needs to move with the case: who uploaded it, which model ran, what changed and when it expires.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24" id="how-it-works">
        <div className="container">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                From upload to defensible result in four steps.
              </h2>
            </div>
            <Link href="/docs#quickstart" className={buttonVariants({ variant: "outline" })}>
              Read the quickstart
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-xl border border-border bg-card p-5">
                <span className="absolute right-5 top-5 text-3xl font-semibold text-muted-foreground/20 tabular-nums">
                  0{index + 1}
                </span>
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Platform
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the whole review, not just the score.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need to run a repeatable media verification workflow, without turning
            your evidence over to an opaque API.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 shadow-soft transition-colors hover:border-primary/30"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Evidence, not vibes
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Show the work behind the verdict.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Each analysis keeps the frame timeline, the most suspicious crops, face-detection
              coverage, the model version and calibration settings. Reviewers can challenge a
              result instead of trusting it blindly.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Ranked evidence thumbnails with face boxes and frame scores",
                "Timeline of sampled frames and temporal instability",
                "Explicit mock-backend warnings during development",
                "Model metadata and calibration temperature stored with every result",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/product#evidence" className={cn(buttonVariants({ variant: "outline" }), "mt-7")}>
              Explore the evidence view
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { score: 86, label: "Frame 241", tone: "danger" },
              { score: 72, label: "Frame 248", tone: "danger" },
              { score: 43, label: "Frame 219", tone: "warning" },
              { score: 19, label: "Frame 203", tone: "success" },
            ].map((frame) => (
              <div
                key={frame.label}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
              >
                <div className="relative aspect-video bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
                  <div className="absolute inset-0 opacity-40 surface-grid" />
                  <div className="absolute left-[26%] top-[18%] h-[58%] w-[42%] rounded-full border-2 border-dashed border-white/40 bg-white/5" />
                  <div className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-white">
                    {frame.label}
                  </div>
                  <div
                    className={cn(
                      "absolute bottom-2 right-2 rounded px-2 py-1 text-[10px] font-semibold text-white",
                      frame.tone === "danger"
                        ? "bg-rose-500"
                        : frame.tone === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                  >
                    {frame.score}%
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Face crop</span>
                  <span className="font-medium tabular-nums">{frame.score} / 100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Honest by design
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              We would rather be useful than sound certain.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Deepfake detection is an adversarial problem. VeriFrame presents scores as
              probabilities, stores the model context and tells you when the signal is weak.
            </p>
            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <ShieldCheck className="size-4" />
                Responsible use
              </p>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
                {DISCLAIMER}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {LIMITATIONS.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="container grid items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1">
            {[
              { icon: Lock, title: "Private by default", body: "Signed object URLs, ownership checks and no third-party inference." },
              { icon: Users, title: "Role-based access", body: "User, admin and super-admin roles with API-enforced permissions." },
              { icon: Clock3, title: "Retention controls", body: "Plan-based expiry, scheduled cleanup and operator retention ceilings." },
              { icon: ShieldCheck, title: "Audit trail", body: "Uploads, deletes, logins and admin actions recorded for review." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Security & privacy
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Evidence stays where it belongs.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Uploads are untrusted by default: type validation, size and duration checks, private
              storage and isolation from other tenants. Your media is processed by a service inside
              your network, not shipped to a public model endpoint.
            </p>
            <Link href="/legal/privacy" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>
              Read the privacy overview
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Start small. Scale when the caseload does.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Plans are enforced by the API and managed by your administrator in this self-hosted
            build. No card is collected here.
          </p>
        </div>
        <div className="mt-10">
          <PricingCards />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Limits are configurable by the operator. Enterprise pricing is arranged directly.
        </p>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions worth asking.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Still unsure? Send us a note and we will answer directly.
            </p>
            <Link href="/contact" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
              Contact the team
            </Link>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
