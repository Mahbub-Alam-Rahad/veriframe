"use client";

import * as React from "react";
import Link from "next/link";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiRequest, errorMessage } from "@/lib/api";

export function VerifyBanner({ email }: { email: string }) {
  const [loading, setLoading] = React.useState(false);
  const [devUrl, setDevUrl] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function resend() {
    setLoading(true);
    try {
      const response = await apiRequest<{ message: string; devVerificationUrl?: string }>(
        "/auth/resend-verification",
        { method: "POST", body: { email } },
      );
      setSent(true);
      setDevUrl(response.devVerificationUrl ?? null);
      toast.success(response.message);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Alert variant="warning" icon={false} className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Verify your email to unlock uploads</p>
            <p className="mt-1 text-sm">
              We sent a link to <span className="font-medium">{email}</span>. Uploads and API keys
              stay disabled until the address is confirmed.
            </p>
            {sent && devUrl ? (
              <Link href={devUrl} className="mt-2 inline-block text-sm font-medium underline underline-offset-4">
                Open the development verification link
              </Link>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={loading}
          onClick={resend}
          className="shrink-0 border-amber-500/30 bg-background/60"
        >
          Resend email
        </Button>
      </div>
    </Alert>
  );
}
