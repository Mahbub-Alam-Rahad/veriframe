import type { Metadata } from "next";
import { Clock3, Mail, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Faq } from "@/components/marketing/faq";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to the VeriFrame team about evaluation, API access, enterprise deployments or security disclosures.",
};

const FAQS = [
  {
    question: "How quickly will I hear back?",
    answer:
      "Messages are stored in the operator's contact inbox. Response times depend on the deployment, but we aim to reply within two business days.",
  },
  {
    question: "Can I request a larger plan?",
    answer:
      "Yes. Include your expected monthly volume, maximum clip length and whether you need API access. An administrator can adjust the plan on your account.",
  },
  {
    question: "Where do I report a security issue?",
    answer:
      "Use this form with the subject “Security” and include enough detail to reproduce the issue. Please do not attach sensitive third-party media. Avoid public disclosure until the operator has had a chance to respond.",
  },
  {
    question: "Do you accept sample videos?",
    answer:
      "For initial conversations, describe the scenario instead of sending media. If a sample is needed later, the operator will provide a private intake path.",
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const params = await searchParams;
  const subject = typeof params.subject === "string" ? params.subject.slice(0, 150) : "";

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" aria-hidden="true" />
        <div className="container relative grid gap-12 py-16 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              Contact
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Tell us what you are trying to verify.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Evaluation questions, API access, enterprise deployment or security reports — send a
              note and it will land in the operator&apos;s inbox.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: Mail, title: "Product & API", body: "Questions about plans, endpoints or integrations." },
                { icon: ShieldCheck, title: "Security", body: "Responsible disclosure and hardening questions." },
                { icon: Clock3, title: "Response time", body: "Usually within two business days." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <ContactForm defaultSubject={subject} />
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Common questions</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A few answers before you write. For technical details, start with the developer docs.
            </p>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>
    </>
  );
}
