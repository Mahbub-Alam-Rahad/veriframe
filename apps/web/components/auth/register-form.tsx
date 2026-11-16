"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import type { RegisterResponse } from "@/lib/types";
import { registerSchema, type RegisterValues } from "@/lib/validation";

export function RegisterForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<RegisterResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    try {
      const response = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: { name: values.name || undefined, email: values.email, password: values.password },
      });
      setCreated(response);
      toast.success("Account created");
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  if (created) {
    return (
      <div>
        <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{created.message}</p>

        {created.devVerificationUrl ? (
          <Alert variant="info" title="Development mode" className="mt-6">
            Email delivery is not configured, so a verification link is shown here. In production
            this link is sent by email only.
            <div className="mt-3">
              <Link href={created.devVerificationUrl} className="font-medium underline underline-offset-4">
                Verify this account
              </Link>
            </div>
          </Alert>
        ) : null}

        <div className="mt-6 space-y-3">
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:bg-accent"
          >
            Go to sign in
          </Link>
          <Link
            href="/contact"
            className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:bg-accent"
          >
            Need help?
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          You can sign in before verifying, but uploads and API keys are blocked until the address
          is confirmed.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <UserPlus className="size-5" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Start with three analyses per month. No card is required in this self-hosted build.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="name" autoComplete="name" placeholder="Alex Morgan" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 10 characters"
            {...register("password")}
          />
          <FieldHint>Use an uppercase letter, a lowercase letter and a number.</FieldHint>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
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
          Create account
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
