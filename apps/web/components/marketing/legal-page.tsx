import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function LegalPage({
  title,
  description,
  updated,
  sections,
  children,
}: {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
  children?: React.ReactNode;
}) {
  return (
    <>
      <section className="border-b border-border bg-muted/20">
        <div className="container py-12 sm:py-16">
          <Badge variant="outline">Legal</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
          <p className="mt-4 text-xs text-muted-foreground">Last updated: {updated}</p>
        </div>
      </section>

      <div className="container grid gap-10 py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <nav className="mt-3 space-y-1" aria-label="Legal sections">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 max-w-3xl">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-900/80 dark:text-amber-100/80">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              This document is a template for a self-hosted deployment, not legal advice. The
              operator of this instance is the data controller and must adapt it to their
              jurisdiction, contracts and actual configuration before relying on it.
            </p>
          </div>

          {children}

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                <div className="prose prose-sm mt-3 max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
