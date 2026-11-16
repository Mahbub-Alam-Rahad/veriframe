import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MailWarning, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { VerifyBanner } from "@/components/dashboard/verify-banner";
import {
  DeleteAccountCard,
  PasswordForm,
  ProfileForm,
  SessionsManager,
} from "@/components/dashboard/settings-forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import { formatDateTime } from "@/lib/format";
import type { SessionInfo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, password, sessions and account.",
};

export default async function SettingsPage() {
  const me = await requireUser("/dashboard/settings");
  let sessions: SessionInfo[] = [];
  let sessionsError: string | null = null;
  try {
    const response = await serverApiRequest<{ sessions: SessionInfo[] }>("/me/sessions");
    sessions = response.sessions;
  } catch (error) {
    sessionsError = errorMessage(error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Profile, security and session controls for your account on this deployment."
      />

      {!me.user.emailVerifiedAt ? <VerifyBanner email={me.user.email} /> : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" />
              Account
            </CardTitle>
            <CardDescription>Identity and access summary.</CardDescription>
          </div>
          <Badge variant={me.user.role === "USER" ? "outline" : "default"}>
            {me.user.role.replace("_", " ")}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all font-medium">{me.user.email}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Plan</dt>
              <dd className="mt-1 font-medium">{me.plan.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Email status
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium">
                {me.user.emailVerifiedAt ? (
                  <>
                    <BadgeCheck className="size-4 text-emerald-500" />
                    Verified {formatDateTime(me.user.emailVerifiedAt)}
                  </>
                ) : (
                  <>
                    <MailWarning className="size-4 text-amber-500" />
                    Not verified
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Member since
              </dt>
              <dd className="mt-1 font-medium">{formatDateTime(me.user.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Account, plan and role changes are performed by an administrator and recorded in the
              audit log. See the{" "}
              <Link href="/legal/privacy" className="font-medium text-primary hover:underline">
                privacy notice
              </Link>{" "}
              for retention details.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm user={me.user} />
        <PasswordForm />
      </div>

      {sessionsError ? (
        <Alert variant="destructive" title="Could not load sessions">
          {sessionsError}
        </Alert>
      ) : (
        <SessionsManager initialSessions={sessions} />
      )}

      <DeleteAccountCard email={me.user.email} />
    </div>
  );
}
