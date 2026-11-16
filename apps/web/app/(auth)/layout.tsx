import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DISCLAIMER } from "@/lib/verdicts";

const POINTS = [
  "HTTP-only session cookies with rotating refresh sessions",
  "Frame-level evidence and model metadata on every result",
  "No third-party inference — your media stays in this deployment",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.9fr]">
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to site
            </Link>
          </div>
        </header>
        <main id="main-content" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-5 py-5 text-center text-xs text-muted-foreground sm:px-8">
          <p>
            By continuing you agree to the{" "}
            <Link href="/legal/terms" className="underline-offset-4 hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
              privacy notice
            </Link>
            .
          </p>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden border-l border-border bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-30 surface-grid" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-20 top-10 size-80 rounded-full bg-indigo-500/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-0 size-80 rounded-full bg-cyan-400/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
            <ShieldCheck className="size-3.5" />
            Self-hosted media forensics
          </div>
          <blockquote className="mt-8 max-w-md text-2xl font-medium leading-snug">
            “A score is only useful if you can see the frames, the model and the uncertainty behind
            it.”
          </blockquote>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            VeriFrame keeps the media, the inference and the evidence trail inside the environment
            your team already controls.
          </p>
        </div>

        <ul className="relative space-y-3">
          {POINTS.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-slate-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              {point}
            </li>
          ))}
        </ul>

        <p className="relative max-w-md text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
      </aside>
    </div>
  );
}
