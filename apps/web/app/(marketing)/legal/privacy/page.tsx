import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How a self-hosted VeriFrame deployment processes account data, uploaded media, analysis results and technical logs.",
};

const sections: LegalSection[] = [
  {
    id: "roles",
    title: "Who is responsible",
    content: (
      <>
        <p>
          VeriFrame is software that an organization runs on its own infrastructure. The
          organization operating this instance (the “operator”) decides what data is collected,
          why it is processed and how long it is kept. In privacy-law terms, the operator is
          normally the data controller; the software project itself does not receive your data.
        </p>
        <p>
          If you are using an account on someone else&apos;s instance, direct privacy requests to
          that operator. Contact details for this deployment should be published by the operator.
        </p>
      </>
    ),
  },
  {
    id: "data",
    title: "Data the software processes",
    content: (
      <>
        <ul>
          <li>
            <strong>Account data:</strong> email address, display name, hashed password, role,
            plan, verification state and login timestamps.
          </li>
          <li>
            <strong>Uploaded media:</strong> the video file, its filename, content type, size,
            duration, resolution and a random storage key.
          </li>
          <li>
            <strong>Analysis data:</strong> sampled frame scores, face-detection coverage, evidence
            thumbnails, verdict, confidence, temporal score, model version and calibration settings.
          </li>
          <li>
            <strong>Usage data:</strong> monthly analysis count, bytes uploaded and API-key usage
            timestamps.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, user agent, request identifiers and audit
            events such as login, upload, deletion and administrative changes.
          </li>
          <li>
            <strong>Contact messages:</strong> name, email, subject and message submitted through
            the contact form.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "purpose",
    title: "Why it is processed",
    content: (
      <>
        <ul>
          <li>To authenticate users and protect accounts and sessions.</li>
          <li>To store, analyze and display the media a user chooses to submit.</li>
          <li>To enforce plan limits, retention and ownership boundaries.</li>
          <li>To produce reports and audit records requested by the user or operator.</li>
          <li>To investigate abuse, security incidents and service reliability issues.</li>
          <li>To respond to contact and support messages.</li>
        </ul>
        <p>
          The operator must identify a lawful basis for each purpose in its jurisdiction, such as
          performance of a contract, legitimate interests, consent or a legal obligation. Do not
          upload media you are not authorized to process.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "Storage and service providers",
    content: (
      <>
        <p>
          Uploaded media and evidence thumbnails are stored in the S3-compatible object storage
          configured by the operator. Application data is stored in the operator&apos;s PostgreSQL
          database. Jobs are queued in the operator&apos;s Redis instance. The ML service runs inside
          the same deployment and does not call a hosted inference provider by default.
        </p>
        <p>
          If the operator enables SMTP, email addresses and message content are sent through the
          configured mail provider. The operator may also choose to connect external monitoring,
          backups or billing systems; those choices are outside the default software behavior and
          must be disclosed by the operator.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention and deletion",
    content: (
      <>
        <p>
          Plans define a default retention period for media. A global operator ceiling can shorten
          it. Videos past their expiry are removed by scheduled maintenance, including analysis
          records and evidence thumbnails. Users can delete a video or their account at any time.
        </p>
        <p>
          Backups, audit logs and security records may persist for a separate period defined by the
          operator. Deleting an account removes its videos, analyses, API keys, sessions and
          verification tokens, but operator-level audit entries may remain with the actor reference
          cleared.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>
          The application uses hashed passwords (Argon2id), HTTP-only session cookies, rotating
          refresh tokens, role-based authorization, ownership checks, signed storage URLs, upload
          validation and rate limits. API keys are stored as hashes and shown once.
        </p>
        <p>
          No system is perfectly secure. Operators should use TLS, restrict network access to the
          database, Redis, object storage and ML service, keep dependencies patched, encrypt backups
          and monitor audit logs.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices and rights",
    content: (
      <>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, export or delete
          personal data, object to processing or withdraw consent. The dashboard provides profile
          editing, session revocation, media deletion and account deletion. For other requests,
          contact the operator of this instance.
        </p>
        <p>
          You can also avoid uploading identifiable people unless you have a lawful basis to do so.
          Removing metadata or cropping a video does not necessarily remove the ability to identify
          the person shown.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        The default deployment uses only essential cookies for authentication and a local theme
        preference. No advertising or analytics cookies are included. See the{" "}
        <Link href="/legal/cookies">cookie notice</Link> for details.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Privacy questions should go to the operator of this instance. If a contact form is enabled,
        use the <Link href="/contact">contact page</Link>. Do not send identity documents or
        sensitive third-party media in a support message.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      description="What a self-hosted VeriFrame instance processes, why, where it is stored and how long it is kept."
      updated="November 2026"
      sections={sections}
    />
  );
}
