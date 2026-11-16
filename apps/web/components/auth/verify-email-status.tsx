"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/progress";
import { apiRequest, errorMessage } from "@/lib/api";

type Status = "verifying" | "success" | "error";

export function VerifyEmailStatus({ token }: { token: string }) {
  const [status, setStatus] = React.useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = React.useState(
    token ? "Verifying your email address…" : "This link is missing its verification token.",
  );
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    let active = true;
    apiRequest<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: { token },
    })
      .then((response) => {
        if (!active) return;
        setStatus("success");
        setMessage(response.message);
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(errorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="text-center">
      <div
        className={`mx-auto flex size-14 items-center justify-center rounded-full ${
          status === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : status === "error"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-primary/10 text-primary"
        }`}
      >
        {status === "verifying" ? (
          <Spinner className="size-6" />
        ) : status === "success" ? (
          <CheckCircle2 className="size-7" />
        ) : (
          <XCircle className="size-7" />
        )}
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        {status === "verifying"
          ? "Verifying your email"
          : status === "success"
            ? "Email verified"
            : "Verification failed"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>

      {status === "success" ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            You can now upload videos, create API keys and use the full dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/dashboard" className={buttonVariants({ className: "w-full" })}>
              Open dashboard
            </Link>
            <Link href="/dashboard/analyze" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Analyze a video
            </Link>
          </div>
        </>
      ) : status === "error" ? (
        <div className="mt-6 space-y-3">
          <Link href="/dashboard" className={buttonVariants({ className: "w-full" })}>
            Go to dashboard
          </Link>
          <p className="text-xs text-muted-foreground">
            If your link expired, sign in and request a new verification email from the dashboard.
            You can also{" "}
            <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
              contact the operator
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <MailCheck className="size-3.5" />
        Email verification protects uploads and API-key creation.
      </div>
    </div>
  );
}
