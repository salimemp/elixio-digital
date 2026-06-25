import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Navbar } from "../components/layout/Navbar";
import { AuthProvider } from "../lib/auth";
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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-display min-h-screen antialiased`}>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
