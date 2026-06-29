import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { CookieBanner } from "../components/layout/CookieBanner";
import { AuthProvider } from "../lib/auth";
import { I18nProvider } from "../lib/i18n-client";
import { ThemeProvider } from "../lib/theme";
import { DEFAULT_LOCALE, resolveLocaleFromCookie, type Locale } from "../lib/i18n";
import { LiveRegions } from "../lib/a11y";
import { A11yToolbar } from "../components/a11y/A11yToolbar";
import { ChatWidget } from "../components/chat/ChatWidget";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://elixiodigital.com"),
  title: {
    default: "Elixio Digital — Marketplace for Creators",
    template: "%s · Elixio Digital",
  },
  description:
    "Discover, preview, and buy high-quality digital assets from independent creators. Templates, design files, code, music, 3D, and more.",
  applicationName: "Elixio Digital",
  keywords: [
    "digital marketplace",
    "creators",
    "templates",
    "design assets",
    "ui kits",
    "icons",
    "code snippets",
    "music",
    "3d assets",
  ],
  authors: [{ name: "Elixio Digital" }],
  creator: "Elixio Digital",
  publisher: "Elixio Digital",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://elixiodigital.com",
    siteName: "Elixio Digital",
    title: "Elixio Digital — Marketplace for Creators",
    description:
      "Discover, preview, and buy high-quality digital assets from independent creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elixio Digital",
    description:
      "Discover, preview, and buy high-quality digital assets from independent creators.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    // Google Search Console
    google: "pcVZ7hKByYRkH5ndPjew7gj2bEkpwdLTC2kQ8WVItAY",
    // Bing Webmaster Tools (msvalidate.01 isn't a top-level key, so it
    // lives in `other`; Next.js renders it as <meta name="msvalidate.01" ...>)
    other: {
      "msvalidate.01": "6D738BE6B98C4FAB5152757BEF3D069E",
    },
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [
        { url: "/rss.xml", title: "Elixio — RSS Feed" },
        { url: "/feed.xml", title: "Elixio — RSS Feed (alias)" },
      ],
      "application/atom+xml": [
        { url: "/atom.xml", title: "Elixio — Atom Feed" },
      ],
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Resolve locale server-side from the cookie so the initial HTML
  // is already in the user's preferred language (no flash of English).
  const cookieStore = cookies();
  const locale: Locale = resolveLocaleFromCookie(cookieStore.get("locale")?.value) ?? DEFAULT_LOCALE;

  return (
    <html lang={locale}>
      <head>
        {/* Feed auto-discovery — RSS readers and browsers pick these up */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Elixio — RSS Feed"
          href="/rss.xml"
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Elixio — Atom Feed"
          href="/atom.xml"
        />
      </head>
      <body className={`${inter.variable} font-display flex min-h-screen flex-col antialiased`}>
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>
            <AuthProvider>
              {/* Skip-to-content link: first focusable element on every page.
                  Hidden by default; appears on focus. */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border-2 focus:border-gum-black focus:bg-gum-yellow focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:text-gum-black focus:shadow-[0_3px_0_0_#111]"
              >
                Skip to main content
              </a>

              <Navbar />
              <main id="main-content" className="flex-1" tabIndex={-1}>
                {children}
              </main>
              <Footer />
              <CookieBanner />

              {/* A11y + chat widgets — bottom-left / bottom-right, don't
                  overlap. Hidden in print. */}
              <A11yToolbar />
              <ChatWidget />

              {/* Live regions for screen reader announcements */}
              <LiveRegions />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
