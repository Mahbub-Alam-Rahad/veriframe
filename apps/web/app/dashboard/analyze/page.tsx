import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AnalyzeWorkspace } from "@/components/dashboard/analyze-workspace";
import { requireUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Analyze video",
  description: "Upload a video for frame-level deepfake analysis on this deployment.",
};

export default async function AnalyzePage() {
  const me = await requireUser("/dashboard/analyze");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analyze"
        title="Analyze a video"
        description="Upload a clip to score sampled frames, detect faces and review the evidence timeline. Processing runs on this deployment."
      />
      <AnalyzeWorkspace
        maxUploadBytes={me.limits.maxUploadBytes}
        maxVideoSeconds={me.limits.maxVideoSeconds}
        remaining={me.usage.remaining}
        emailVerified={Boolean(me.user.emailVerifiedAt)}
        retentionDays={me.limits.retentionDays}
      />
    </div>
  );
}
