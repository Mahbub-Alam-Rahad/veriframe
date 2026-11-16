import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function CtaBand({
  title = "See what your video is really made of.",
  description = "Upload a clip, review frame-level evidence and export a report. Your media stays on your own infrastructure.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="container py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-6 py-12 text-white shadow-glow sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-cyan-300/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-indigo-100">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Create an account
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
            >
              Read the API docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
