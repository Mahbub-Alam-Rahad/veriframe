import Link from "next/link";
import { ArrowLeft, Compass, ScanLine } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/20">
      <header className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="VeriFrame home">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass className="size-7" />
          </span>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            404 — not found
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page does not exist</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The link may be outdated, or the video or analysis may have expired under your
            retention window. Check the address and try again.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className={buttonVariants()}>
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
            <Link href="/dashboard/analyze" className={buttonVariants({ variant: "outline" })}>
              <ScanLine className="size-4" />
              Analyze a video
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              { href: "/", label: "Home" },
              { href: "/product", label: "Product" },
              { href: "/pricing", label: "Pricing" },
              { href: "/docs", label: "Docs" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className={cn("hover:text-foreground hover:underline")}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
