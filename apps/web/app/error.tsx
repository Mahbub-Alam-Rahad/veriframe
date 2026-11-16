"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-7" />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">This view could not be rendered</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The request may have failed while contacting the API. You can retry, or return to the
          dashboard if the problem persists.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
