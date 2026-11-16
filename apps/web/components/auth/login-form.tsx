"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/api";
import type { SessionResponse } from "@/lib/types";
import { loginSchema, type LoginValues } from "@/lib/validation";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      await apiRequest<SessionResponse>("/auth/login", {
        method: "POST",
        body: values,
      });
      toast.success("Signed in");
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safeNext);
      router.refresh();
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <LockKeyhole className="size-5" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to upload video, review analyses and manage your account.
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            {...register("password")}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Sign in
          {!isSubmitting ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to VeriFrame?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-8 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Self-hosted instance</p>
        <p className="mt-1">
          Accounts are managed by the operator of this deployment. There is no external identity
          provider.
        </p>
      </div>
    </div>
  );
}
