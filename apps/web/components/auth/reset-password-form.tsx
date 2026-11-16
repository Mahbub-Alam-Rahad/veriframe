"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";

export function ResetPasswordForm({ token }: { token: string }) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    try {
      await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { token, password: values.password },
      });
      setDone(true);
      toast.success("Password updated");
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset link is missing</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page needs a one-time token from your reset email. Request a new link to continue.
        </p>
        <Link href="/forgot-password" className={buttonVariants({ className: "mt-6 w-full" })}>
          Request a reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been changed and other sessions were signed out. Sign in with the new
          password.
        </p>
        <Link href="/login" className={buttonVariants({ className: "mt-6 w-full" })}>
          Sign in
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <KeyRound className="size-5" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use at least 10 characters with an uppercase letter, a lowercase letter and a number.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            {...register("password")}
          />
          <FieldHint>Changing your password revokes other active sessions.</FieldHint>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            {...register("confirmPassword")}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Update password
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
