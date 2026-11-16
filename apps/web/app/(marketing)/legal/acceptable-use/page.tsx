import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Acceptable use",
  description:
    "What you may and may not do with a VeriFrame deployment, including consent, privacy and API usage rules.",
};

const sections: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose of the service",
    content: (
      <p>
        VeriFrame is intended for legitimate media verification, research, journalism, trust and
        safety, legal review and security work. It produces probabilistic signals to support human
        review, not definitive determinations about a person or piece of media.
      </p>
    ),
  },
  {
    id: "allowed",
    title: "Permitted use",
    content: (
      <>
        <ul>
          <li>Analyzing media you own, have permission to process or have a lawful basis to review.</li>
          <li>Supporting editorial verification, fraud investigations and platform moderation.</li>
          <li>Research on detection performance with appropriately handled datasets.</li>
          <li>Integrating analysis into your own workflow through the documented API.</li>
          <li>Testing and evaluating the platform with synthetic or consented samples.</li>
        </ul>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited use",
    content: (
      <>
        <p>You must not use the service to:</p>
        <ul>
          <li>
            Create, request or distribute non-consensual intimate imagery, sexual content involving
            minors, or content that facilitates abuse.
          </li>
          <li>
            Harass, stalk, intimidate, dox or make automated adverse decisions about an identifiable
            person without a lawful basis and human review.
          </li>
          <li>
            Conduct covert surveillance or process media obtained unlawfully or without the
            necessary authority.
          </li>
          <li>
            Generate disinformation, falsely claim that authentic media is fake, or misrepresent a
            score as proof.
          </li>
          <li>
            Upload malware, exploit payloads, or files designed to attack the service or another
            system.
          </li>
          <li>
            Circumvent plan limits, rate limits, ownership checks, authentication or retention
            controls.
          </li>
          <li>
            Resell, sublicense or provide the service to third parties unless the operator has
            agreed in writing.
          </li>
          <li>Violate privacy, publicity, intellectual-property or other rights.</li>
        </ul>
      </>
    ),
  },
  {
    id: "results",
    title: "Presenting results responsibly",
    content: (
      <>
        <ul>
          <li>Describe scores as probabilistic signals, not proof of manipulation.</li>
          <li>Include the model version and limitations when publishing a finding.</li>
          <li>Do not strip warnings about low face coverage, compression or mock backends.</li>
          <li>Seek corroborating evidence and human review before acting on a result.</li>
          <li>Correct the record promptly if a result is later shown to be misleading.</li>
        </ul>
      </>
    ),
  },
  {
    id: "api",
    title: "API and automation",
    content: (
      <>
        <p>
          API keys are personal to the account and must be stored securely. Do not embed keys in
          client-side code or public repositories. Respect rate limits and use backoff when polling.
          The default public API allowance is 60 requests per minute per key, with a global limit per
          IP.
        </p>
        <p>
          Automated decisions about individuals require human review and a lawful basis. Do not use
          the API to build a public “fake score” service that misrepresents certainty.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy and consent",
    content: (
      <p>
        Upload only media you are authorized to process. Consider whether the people shown have a
        reasonable expectation of privacy, whether consent is required and whether the retention
        period is appropriate. Delete media when it is no longer needed. See the{" "}
        <Link href="/legal/privacy">privacy notice</Link>.
      </p>
    ),
  },
  {
    id: "enforcement",
    title: "Enforcement and reporting",
    content: (
      <p>
        The operator may remove content, suspend accounts, revoke API keys or report unlawful
        activity. To report abuse or a security issue on this instance, use the{" "}
        <Link href="/contact">contact page</Link> with the subject “Abuse” or “Security”. Include
        relevant identifiers but do not attach sensitive third-party media.
      </p>
    ),
  },
];

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable use policy"
      description="The boundaries for legitimate media verification and the conduct that is not permitted on this instance."
      updated="November 2026"
      sections={sections}
    />
  );
}
