import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Cookie notice",
  description:
    "The essential cookies used by a default VeriFrame deployment and how to control them.",
};

const sections: LegalSection[] = [
  {
    id: "essential",
    title: "Essential cookies",
    content: (
      <>
        <p>
          The default deployment sets two HTTP-only cookies for authentication. They are required
          for the dashboard and cannot be disabled while signed in.
        </p>
        <div className="not-prose mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Cookie</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Purpose</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">vf_access</td>
                <td className="px-4 py-3 text-muted-foreground">Short-lived access session; HTTP-only, SameSite=Lax.</td>
                <td className="px-4 py-3 text-muted-foreground">15 minutes (default)</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">vf_refresh</td>
                <td className="px-4 py-3 text-muted-foreground">Rotating refresh session; revoked on sign-out or reuse detection.</td>
                <td className="px-4 py-3 text-muted-foreground">30 days (default)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "preferences",
    title: "Local preferences",
    content: (
      <p>
        The theme toggle stores your light or dark preference in browser local storage, not in a
        cookie. It is read by the page to avoid a flash of the wrong theme and is not sent to the
        server.
      </p>
    ),
  },
  {
    id: "analytics",
    title: "Analytics and advertising",
    content: (
      <p>
        The default software includes no advertising, tracking pixels or third-party analytics
        cookies. If the operator adds analytics, it must be disclosed here and, where required,
        enabled only after consent. Ask the operator for the current configuration of this instance.
      </p>
    ),
  },
  {
    id: "control",
    title: "Managing cookies",
    content: (
      <p>
        You can clear or block cookies in your browser, but blocking the authentication cookies
        will prevent you from signing in. Signing out revokes the refresh session and clears both
        cookies. Deleting your account also invalidates active sessions.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Questions",
    content: (
      <p>
        For questions about cookies or privacy on this instance, see the{" "}
        <Link href="/legal/privacy">privacy notice</Link> or use the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie notice"
      description="The small number of browser cookies required by the authentication system, and the local theme preference."
      updated="November 2026"
      sections={sections}
    />
  );
}
