import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "VeriFrame — Self-hosted deepfake detection",
    template: "%s · VeriFrame",
  },
  description:
    "Analyze video for signs of manipulation with a self-hosted, privacy-first deepfake detection platform. Probabilistic scores, frame-level evidence and audit-ready reports.",
  applicationName: "VeriFrame",
  keywords: [
    "deepfake detection",
    "media forensics",
    "video analysis",
    "self-hosted",
    "AI detection",
  ],
  authors: [{ name: "VeriFrame" }],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    url: appUrl,
    title: "VeriFrame — Self-hosted deepfake detection",
    description:
      "Frame-level forensic signals, probabilistic scores and evidence reports. Your media stays on your infrastructure.",
    siteName: "VeriFrame",
  },
  twitter: {
    card: "summary_large_image",
    title: "VeriFrame — Self-hosted deepfake detection",
    description:
      "Frame-level forensic signals, probabilistic scores and evidence reports. Your media stays on your infrastructure.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
