import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Cpu, Database, GitBranch, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import { CtaBand } from "@/components/marketing/cta-band";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why VeriFrame exists: honest media forensics, self-hosted processing and evidence that can be reviewed.",
};

const PRINCIPLES = [
  {
    icon: Scale,
    title: "Uncertainty is a feature",
    body: "A detector that always sounds certain is not trustworthy. Verdict bands, confidence values and limitations are part of the product, not footnotes.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence stays private",
    body: "Media is sensitive. The default architecture keeps uploads, inference and results inside the operator's infrastructure.",
  },
  {
    icon: Compass,
    title: "Explain the signal",
    body: "A number without context is hard to defend. We store the frames, face coverage, model version and calibration settings behind each result.",
  },
  {
    icon: HeartHandshake,
    title: "Build for human review",
    body: "The output is designed to support a journalist, investigator or trust team — not to replace their judgement.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
        <div className="container relative py-16 sm:py-24">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            About VeriFrame
          </Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Media forensics should be inspectable, private and honest.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            VeriFrame is a self-hosted deepfake detection platform for teams that need a repeatable
            workflow around synthetic media. It is intentionally not a magic authenticity button.
          </p>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Why we built it
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              The most important question is not “real or fake?”
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                It is “what did we check, what did the model see, how confident are we, and what
                should a human review next?” Most detection demos answer a narrower question and
                hide the rest.
              </p>
              <p>
                The platform was built around that broader workflow: validated uploads, an isolated
                analysis service, frame-level evidence, model versioning, role-based access and an
                audit trail. The score is one output among several.
              </p>
              <p>
                It is also built to run on ordinary hardware. CPU-first inference with sampled
                frames makes the stack usable without a dedicated GPU, while leaving room to swap in
                a larger model when the workload justifies it.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 py-16 sm:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Under the hood
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              A deliberately boring stack.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Boring is good for evidence systems. Each component has a narrow job and can be
              replaced without rewriting the workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: GitBranch,
                title: "Next.js web app",
                body: "Server-rendered dashboard, cookie sessions, upload experience and admin console.",
              },
              {
                icon: Database,
                title: "NestJS + PostgreSQL",
                body: "Authorization, ownership checks, usage accounting, reports and audit logging via Prisma.",
              },
              {
                icon: Cpu,
                title: "FastAPI + PyTorch",
                body: "Private inference service with frame extraction, face crops, scoring and evidence thumbnails.",
              },
              {
                icon: ShieldCheck,
                title: "Redis + MinIO",
                body: "BullMQ job queue for analysis and S3-compatible object storage for media and thumbnails.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                <item.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">What this project is</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                "A complete, runnable reference implementation of a self-hosted detection platform.",
                "A workflow for evidence review, model versioning, retention and audit.",
                "A starting point for teams that need to integrate detection into their own process.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">What it is not</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {[
                "Proof that a video is authentic or manipulated.",
                "A hosted service that receives your media by default.",
                "A replacement for source verification, editorial judgement or legal review.",
                "A guarantee that a new generator will be detected.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="container flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Have a workflow we should support?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We are interested in newsroom, legal and platform trust use cases.
            </p>
          </div>
          <Link href="/contact" className={cn(buttonVariants(), "shrink-0")}>
            Start a conversation
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
