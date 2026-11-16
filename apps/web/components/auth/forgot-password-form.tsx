"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import type { ForgotPasswordResponse } from "@/lib/types";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<ForgotPasswordResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    try {
      const response = await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: values,
      });
      setSent(response);
      toast.success("Request received");
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  if (sent) {
    return (
      <div>
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sent.message}</p>

        {sent.devResetUrl ? (
          <Alert variant="info" title="Development mode" className="mt-6">
            Email delivery is not configured, so the reset link is shown here. In production it is
            sent by email only.
            <div className="mt-3">
              <Link href={sent.devResetUrl} className="font-medium underline underline-offset-4">
                Reset your password
              </Link>
            </div>
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/login" className={buttonVariants({ className: "w-full" })}>
            Back to sign in
          </Link>
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setSent(null)}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <KeyRound className="size-5" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email on your account and we will send a one-time reset link. The link expires
        after one hour.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@organization.com"
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send reset link
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
