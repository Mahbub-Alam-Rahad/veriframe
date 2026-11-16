import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, KeyRound, Lock, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DISCLAIMER } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Developer docs",
  description:
    "VeriFrame API quickstart, authentication, video upload and polling, response schema, rate limits and responsible-use guidance.",
};

const NAV = [
  { href: "#quickstart", label: "Quickstart" },
  { href: "#authentication", label: "Authentication" },
  { href: "#upload", label: "Upload a video" },
  { href: "#poll", label: "Poll for results" },
  { href: "#response", label: "Response schema" },
  { href: "#errors", label: "Errors & limits" },
  { href: "#retention", label: "Retention" },
  { href: "#responsible-use", label: "Responsible use" },
];

const ENDPOINTS = [
  { method: "POST", path: "/public/v1/videos", description: "Upload a video and enqueue analysis" },
  { method: "GET", path: "/public/v1/videos/:id", description: "Get a video, signed URL and analysis" },
  { method: "DELETE", path: "/public/v1/videos/:id", description: "Delete a video, analysis and thumbnails" },
];

const QUICKSTART = `# 1. Upload a clip (multipart/form-data)
curl -X POST "$APP_URL/api/v1/public/v1/videos" \\
  -H "x-api-key: $VERIFRAME_API_KEY" \\
  -F "file=@interview.mp4"

# 2. Read the id from the response, then poll
curl "$APP_URL/api/v1/public/v1/videos/$VIDEO_ID" \\
  -H "x-api-key: $VERIFRAME_API_KEY"

# 3. Delete the media when you no longer need it
curl -X DELETE "$APP_URL/api/v1/public/v1/videos/$VIDEO_ID" \\
  -H "x-api-key: $VERIFRAME_API_KEY"`;

const JAVASCRIPT = `const base = process.env.APP_URL + "/api/v1";
const key = process.env.VERIFRAME_API_KEY;

const form = new FormData();
form.append("file", fileBlob, "interview.mp4");

const upload = await fetch(base + "/public/v1/videos", {
  method: "POST",
  headers: { "x-api-key": key }, // do not set Content-Type for FormData
  body: form,
});
const video = await upload.json();

let result = video;
while (["QUEUED", "PROCESSING", "UPLOADED"].includes(result.status)) {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const poll = await fetch(base + "/public/v1/videos/" + video.id, {
    headers: { "x-api-key": key },
  });
  result = await poll.json();
}

console.log(result.analysis?.fakeScore, result.analysis?.verdict);`;

const RESPONSE = `{
  "id": "cm5…",
  "originalName": "interview.mp4",
  "status": "DONE",
  "durationSeconds": 42.8,
  "width": 1920,
  "height": 1080,
  "expiresAt": "2026-12-15T10:00:00.000Z",
  "videoUrl": "https://storage.example/signed…",
  "analysis": {
    "id": "cm5…",
    "fakeScore": 82,
    "fakeProbability": 0.914,
    "verdict": "LIKELY_FAKE",
    "confidence": 0.914,
    "temporalScore": 0.772,
    "framesAnalyzed": 84,
    "facesDetected": 79,
    "frameScores": [
      { "index": 12, "timestampSeconds": 3.4, "score": 0.86, "faceDetected": true, "box": [412, 118, 260, 300] }
    ],
    "flaggedFrames": [
      { "index": 12, "timestampSeconds": 3.4, "score": 0.86, "url": "https://storage.example/…", "rank": 1 }
    ],
    "details": {
      "backend": "hf",
      "modelId": "dima806/deepfake_vs_real_image_detection",
      "mock": false,
      "sampleFps": 1,
      "calibrationTemperature": 1,
      "warnings": []
    }
  }
}`;

const ERRORS = `{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Only MP4, MOV, WebM and MKV video files are accepted",
  "requestId": "6f1c…",
  "timestamp": "2026-11-15T10:00:00.000Z",
  "path": "/api/v1/public/v1/videos"
}`;

const RATE_LIMITS = [
  ["Global API", "120 requests / minute / IP"],
  ["Public API key", "60 requests / minute / key"],
  ["Login", "8 attempts / minute / IP"],
  ["Registration", "5 attempts / minute / IP"],
  ["Password reset", "3 requests / minute / IP"],
  ["Upload", "10 uploads / minute / account"],
];

export default function DocsPage() {
  return (
    <div className="border-b border-border">
      <div className="container grid gap-10 py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-4" />
              Documentation
            </p>
            <nav className="mt-4 space-y-1" aria-label="Docs navigation">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">OpenAPI</p>
              <p className="mt-1">
                Swagger UI is available at{" "}
                <code className="rounded bg-muted px-1">/api/docs</code> when enabled.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0" id="main-content">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            API v1
          </Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">Developer documentation</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            The VeriFrame API lets your systems upload video, poll analysis state and retrieve
            frame-level results. Public endpoints use an API key; browser endpoints use an HTTP-only
            session cookie.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Create an account
              <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/dashboard/api-keys" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <KeyRound className="size-3.5" />
              Manage API keys
            </Link>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Base URL</p>
            <code className="mt-1 block break-all rounded bg-background px-3 py-2 font-mono text-xs">
              https://your-veriframe-host/api/v1
            </code>
          </div>

          <section id="quickstart" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Quickstart</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Public API access requires a Pro or Enterprise plan. Create a key in the dashboard,
              copy it once, then upload a video. The secret is stored as a hash and cannot be shown
              again.
            </p>
            <CodeBlock code={QUICKSTART} filename="quickstart.sh" className="mt-5" />
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-900/80 dark:text-amber-100/80">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                The upload request must use <code className="font-mono">multipart/form-data</code>{" "}
                with the field name <code className="font-mono">file</code>. Do not set a JSON
                content type.
              </p>
            </div>
          </section>

          <section id="authentication" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Authentication</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <KeyRound className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">API keys</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Send <code className="rounded bg-muted px-1 font-mono text-xs">x-api-key</code> on
                  public endpoints. Keys inherit the account plan, ownership checks and monthly
                  allowance. Store them in a secret manager.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <Lock className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">Browser sessions</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The dashboard uses HTTP-only access and refresh cookies, same-origin requests and
                  rotating refresh sessions. JavaScript never receives the tokens.
                </p>
              </div>
            </div>
          </section>

          <section id="upload" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Upload a video</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The API validates the file signature, size and duration before storage. A successful
              upload reserves one analysis from the monthly allowance and enqueues a job.
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Path</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((endpoint) => (
                    <tr key={endpoint.path} className="border-t border-border">
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                            endpoint.method === "POST" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            endpoint.method === "GET" && "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                            endpoint.method === "DELETE" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {endpoint.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{endpoint.path}</td>
                      <td className="px-4 py-3 text-muted-foreground">{endpoint.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Accepted containers: MP4, MOV, WebM, MKV and M4V. Limits depend on the account plan.
            </p>
          </section>

          <section id="poll" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Poll for results</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Video status moves from <code className="font-mono text-xs">QUEUED</code> to{" "}
              <code className="font-mono text-xs">PROCESSING</code> and then{" "}
              <code className="font-mono text-xs">DONE</code> or{" "}
              <code className="font-mono text-xs">FAILED</code>. Poll every few seconds with
              backoff; do not busy-loop. The response includes a signed video URL while the object
              exists.
            </p>
            <CodeBlock code={JAVASCRIPT} language="javascript" filename="analyze.mjs" className="mt-5" />
            <p className="mt-3 text-xs text-muted-foreground">
              Failed videos expose a safe error message. The dashboard can retry a failed job; the
              public API does not expose a retry route in this build.
            </p>
          </section>

          <section id="response" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Response schema</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Scores are probabilities, not proof. <code className="font-mono text-xs">fakeScore</code>{" "}
              is a 0–100 presentation score; <code className="font-mono text-xs">fakeProbability</code>{" "}
              is the calibrated probability returned by the pipeline. Verdict bands are{" "}
              <code className="font-mono text-xs">LIKELY_REAL</code>,{" "}
              <code className="font-mono text-xs">UNCERTAIN</code> and{" "}
              <code className="font-mono text-xs">LIKELY_FAKE</code>.
            </p>
            <CodeBlock code={RESPONSE} language="json" filename="video.json" className="mt-5" />
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-900/80 dark:text-amber-100/80">
              {DISCLAIMER}
            </div>
          </section>

          <section id="errors" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Errors & limits</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Errors are JSON with a stable shape. Include the{" "}
              <code className="font-mono text-xs">requestId</code> when contacting support. Validation
              messages may be a string or an array of strings.
            </p>
            <CodeBlock code={ERRORS} language="json" filename="error.json" className="mt-5" />
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Scope</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Default limit</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMITS.map(([scope, limit]) => (
                    <tr key={scope} className="border-t border-border">
                      <td className="px-4 py-3">{scope}</td>
                      <td className="px-4 py-3 text-muted-foreground">{limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="retention" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Retention</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every video has an <code className="font-mono text-xs">expiresAt</code> timestamp
              derived from the plan and the operator&apos;s global ceiling. A scheduled maintenance
              job deletes expired media, stale sessions and old verification tokens. Deleting a
              video removes its object storage and evidence thumbnails immediately.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Signed URLs are short-lived. Do not treat them as permanent links or share them
              outside your organization.
            </p>
          </section>

          <section id="responsible-use" className="mt-14 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Responsible use</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Use the platform to support verification, not to harass, dox or make automated
                determinations about people. A score is not evidence of intent.
              </p>
              <p>
                Present results with the model version and limitations. Do not strip warnings from
                reports. If you publish a finding, explain that the tool estimates manipulation
                likelihood and can be wrong in both directions.
              </p>
              <p>
                Operators are responsible for lawful basis, consent, retention and access control
                for the media they process. See the{" "}
                <Link href="/legal/acceptable-use" className="text-primary underline-offset-4 hover:underline">
                  acceptable use policy
                </Link>
                .
              </p>
            </div>
          </section>

          <div className="mt-14 flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <Terminal className="size-4 text-primary" />
            Generated OpenAPI documentation is available at <code className="font-mono">/api/docs</code>{" "}
            when <code className="font-mono">SWAGGER_ENABLED=true</code>.
          </div>
        </main>
      </div>
    </div>
  );
}
