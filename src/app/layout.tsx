import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HintLayer } from "@/components/ui/Hint";

// Geist Sans is kept as a fallback chain entry. The primary face is TASA Orbiter,
// loaded from Fontshare (Pangram Pangram's free CDN) via a stylesheet link below.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reconciliation · BPO",
  description: "Property-accounting reconciliation workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Numerals face. Digits appear above the fold on every screen, so this
          * is preloaded rather than discovered when the CSS resolves. Self-hosted,
          * so there is no third-party connection to warm up. */}
        <link
          rel="preload"
          href="/fonts/host-grotesk-latin-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=tasa-orbiter@300,400,500,600&display=swap"
        />
      </head>
      <body className="min-h-full">
        {children}
        {/* One listener for every `data-hint` in the app. Mounted here rather
          * than per-screen so a hint cannot be missing on the one route nobody
          * remembered to add it to. See components/ui/Hint.tsx. */}
        <HintLayer />
      </body>
    </html>
  );
}
