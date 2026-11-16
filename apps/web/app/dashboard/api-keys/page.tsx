import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { PageHeader } from "@/components/page-header";
import { ApiKeysManager } from "@/components/dashboard/api-keys-manager";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireUser } from "@/lib/auth-server";
import type { ApiKeyListResponse } from "@/lib/types";

export const metadata: Metadata = {
  title: "API keys",
  description: "Create and revoke keys for the public analysis API.",
};

const EXAMPLE = `curl -X POST https://your-host/api/v1/public/v1/videos \\
  -H "x-api-key: vf_live_..." \\
  -F "file=@clip.mp4"

# Poll the returned analysis id
curl https://your-host/api/v1/public/v1/videos/VIDEO_ID \\
  -H "x-api-key: vf_live_..."`;

export default async function ApiKeysPage() {
  const me = await requireUser("/dashboard/api-keys");
  let keys: ApiKeyListResponse | null = null;
  let loadError: string | null = null;
  try {
    keys = await serverApiRequest<ApiKeyListResponse>("/api-keys");
  } catch (error) {
    loadError = errorMessage(error);
  }

  const activeKeys = keys?.items.filter((key) => !key.revokedAt).length ?? 0;
  const blockedReason = !me.user.emailVerifiedAt
    ? "Confirm your email address before creating API keys."
    : me.user.plan === "FREE"
      ? "API access is available on the Pro and Enterprise plans. Ask the operator of this deployment to change your plan."
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Developer"
        title="API keys"
        description="Submit videos and retrieve analyses programmatically. Keys are scoped to your account and can be revoked at any time."
        actions={
          <Link href="/docs" className={buttonVariants({ variant: "outline" })}>
            <BookOpen className="size-4" />
            API documentation
          </Link>
        }
      />

      {loadError ? (
        <Alert variant="destructive" title="Could not load API keys">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      <ApiKeysManager
        initialKeys={keys?.items ?? []}
        maxKeys={me.limits.maxApiKeys}
        canCreate={blockedReason === null && activeKeys < me.limits.maxApiKeys}
        blockedReason={blockedReason}
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quick start</CardTitle>
            <CardDescription>
              Upload with a multipart request, then poll the video until the analysis is complete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={EXAMPLE} language="bash" />
            <Link
              href="/docs#public-api"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Read the full public API reference
              <ArrowUpRight className="size-3" />
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Key handling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Keys are hashed with a server-side secret. The plaintext value is returned once.</p>
              <p>Revocation takes effect on the next request and is written to the audit log.</p>
              <p>
                Use separate keys per environment so you can rotate one without disrupting the
                others.
              </p>
            </CardContent>
          </Card>
          <Alert variant="info" title="Rate limits">
            Public API requests are limited to 60 per minute per deployment. Upload limits follow
            your plan and are checked when the job is enqueued.
          </Alert>
        </div>
      </div>
    </div>
  );
}
