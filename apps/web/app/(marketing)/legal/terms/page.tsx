import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Terms for using a self-hosted VeriFrame deployment, including accounts, acceptable use, probabilistic results and liability.",
};

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    content: (
      <p>
        By accessing or using this VeriFrame instance, you agree to these terms and to the{" "}
        <Link href="/legal/acceptable-use">acceptable use policy</Link>. If you do not agree, do not
        use the service. The operator may update these terms; continued use after an update means
        you accept the revised terms.
      </p>
    ),
  },
  {
    id: "service",
    title: "The service",
    content: (
      <p>
        VeriFrame analyzes video for statistical signs of manipulation and presents probabilistic
        results with frame-level evidence. The service is self-hosted by the operator. Features,
        limits and availability may change. The software is provided under the MIT license; these
        terms govern the operated instance, not the open-source license itself.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and security",
    content: (
      <>
        <ul>
          <li>Provide accurate account information and keep your credentials confidential.</li>
          <li>You are responsible for activity under your account and API keys.</li>
          <li>Do not share an account between people; ask the operator about additional seats.</li>
          <li>Notify the operator promptly if you suspect unauthorized access.</li>
          <li>Email verification may be required before uploads or API-key creation.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your media and results",
    content: (
      <>
        <p>
          You retain ownership of the media you upload and must have the rights needed to process
          it. You grant the operator permission to store, copy, analyze and delete the media solely
          to operate the service and produce results for you.
        </p>
        <p>
          Analysis outputs are estimates. They are not proof of authenticity or manipulation and
          must not be presented as such. You are responsible for how you interpret and publish
          results, including any legal, editorial or professional obligations that apply.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <p>
        Your use must comply with the <Link href="/legal/acceptable-use">acceptable use policy</Link>{" "}
        and applicable law. The operator may suspend or terminate access for abuse, security risk,
        non-payment (where applicable) or violation of these terms.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and support",
    content: (
      <p>
        The operator aims to keep the instance available but does not guarantee uninterrupted
        service. Maintenance, dependency failures, capacity limits and security incidents may cause
        downtime. Support and service levels, if any, are agreed separately with the operator.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer of warranties",
    content: (
      <p>
        To the maximum extent permitted by law, the service is provided “as is” and “as available”
        without warranties of any kind, express or implied, including merchantability, fitness for a
        particular purpose, non-infringement and accuracy. No warranty is made that a particular
        manipulation will be detected or that a result is correct.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: (
      <p>
        To the maximum extent permitted by law, the operator is not liable for indirect, incidental,
        special, consequential or punitive damages, or for lost profits, data, reputation or
        business opportunity arising from use of the service. Where liability cannot be excluded, it
        is limited to the amount paid to the operator for the service in the twelve months before
        the claim, or the minimum permitted by law.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    content: (
      <p>
        You may stop using the service and delete your account at any time. The operator may suspend
        or terminate access for violations, security risk or operational reasons. On termination,
        media is deleted according to the retention policy, while audit and security records may be
        retained as required by law.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and contact",
    content: (
      <p>
        The operator must specify the governing law and venue for this instance. Questions about
        these terms should go to the operator through the <Link href="/contact">contact page</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      description="The rules for using this self-hosted instance, including account responsibilities and the limits of probabilistic results."
      updated="November 2026"
      sections={sections}
    />
  );
}
