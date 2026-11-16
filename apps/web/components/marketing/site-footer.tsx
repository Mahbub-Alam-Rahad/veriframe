import Link from "next/link";
import { Logo } from "@/components/logo";
import { DISCLAIMER } from "@/lib/verdicts";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "API reference" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/docs#responsible-use", label: "Responsible use" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/acceptable-use", label: "Acceptable use" },
      { href: "/legal/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Privacy-first media forensics for teams that need to understand manipulated video —
              without sending evidence to a third-party inference API.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground/80">{DISCLAIMER}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VeriFrame. Released under the MIT license.</p>
          <p>Self-hosted by design. No media leaves your infrastructure.</p>
        </div>
      </div>
    </footer>
  );
}
