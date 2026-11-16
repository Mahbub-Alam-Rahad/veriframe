"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  KeyRound,
  Laptop,
  LogOut,
  MonitorSmartphone,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { SessionInfo, User } from "@/lib/types";
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema,
  type ChangePasswordValues,
  type DeleteAccountValues,
  type ProfileValues,
} from "@/lib/validation";

export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "" },
  });

  async function onSubmit(values: ProfileValues) {
    setServerError(null);
    try {
      await apiRequest<{ user: User }>("/me", { method: "PATCH", body: values });
      toast.success("Profile updated");
      reset(values);
      router.refresh();
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" />
          Profile
        </CardTitle>
        <CardDescription>How your name appears in the workspace and reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
          <div className="space-y-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" placeholder="Your name" autoComplete="name" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
            <FieldHint>Leave blank to use your email address in the interface.</FieldHint>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled readOnly />
            <FieldHint>Contact the operator to change the email on your account.</FieldHint>
          </div>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            <Save className="size-4" />
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setServerError(null);
    try {
      const response = await apiRequest<{ message: string }>("/me/password", {
        method: "POST",
        body: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      toast.success(response.message);
      reset();
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          Password
        </CardTitle>
        <CardDescription>
          Changing your password signs out every other session. This session stays active.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            <FieldError>{errors.currentPassword?.message}</FieldError>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              <FieldError>{errors.newPassword?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              <FieldError>{errors.confirmPassword?.message}</FieldError>
            </div>
          </div>
          <FieldHint>
            At least 10 characters with upper and lower case letters and a number.
          </FieldHint>
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SessionsManager({ initialSessions }: { initialSessions: SessionInfo[] }) {
  const router = useRouter();
  const [sessions, setSessions] = React.useState(initialSessions);
  const [revoking, setRevoking] = React.useState<string | null>(null);

  async function revoke(session: SessionInfo) {
    setRevoking(session.id);
    try {
      await apiRequest(`/me/sessions/${session.id}`, { method: "DELETE" });
      setSessions((current) => current.filter((item) => item.id !== session.id));
      toast.success("Session revoked");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-primary" />
          Active sessions
        </CardTitle>
        <CardDescription>
          Devices with a valid refresh session. Revoke anything you do not recognize.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions were found.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Laptop className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session.userAgent ? session.userAgent.split(")")[0]?.slice(0, 70) : "Unknown device"}
                      {session.current ? (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          This device
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {session.ip ?? "Unknown IP"} · started {formatRelative(session.createdAt)} ·
                      expires {formatDateTime(session.expiresAt)}
                    </p>
                  </div>
                </div>
                {session.current ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Current</span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={revoking === session.id}
                    onClick={() => revoke(session)}
                    className="shrink-0"
                  >
                    <LogOut className="size-3.5" />
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DeleteAccountCard({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", confirm: "" as "DELETE" },
  });

  async function onSubmit(values: DeleteAccountValues) {
    setServerError(null);
    try {
      await apiRequest("/me", { method: "DELETE", body: values });
      toast.success("Account deleted");
      router.replace("/");
      router.refresh();
    } catch (error) {
      const message = errorMessage(error);
      setServerError(message);
      toast.error(message);
    }
  }

  return (
    <Card className="border-rose-500/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-4" />
          Danger zone
        </CardTitle>
        <CardDescription>
          Deleting your account removes the profile, videos, analyses and stored media. This cannot
          be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" />
          Delete account
        </Button>
      </CardContent>

      <Modal
        open={open}
        onClose={() => {
          if (isSubmitting) return;
          setOpen(false);
          reset();
          setServerError(null);
        }}
        title="Delete your account permanently?"
        description={`This will remove ${email}, all uploaded media, analyses and API keys.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
                setServerError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="delete-account-form" variant="destructive" loading={isSubmitting}>
              Delete forever
            </Button>
          </>
        }
      >
        <form id="delete-account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">Confirm your password</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono">DELETE</span> to confirm
            </Label>
            <Input id="delete-confirm" autoComplete="off" {...register("confirm")} />
            <FieldError>{errors.confirm?.message}</FieldError>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
