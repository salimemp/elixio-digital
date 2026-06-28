"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n-client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

/**
 * Top navbar with a "Get Started" dropdown that lets the visitor pick
 * Buyer or Creator signup directly. All labels are pulled from the
 * i18n runtime so the navbar fully translates with the locale.
 *
 * Includes a LanguageSwitcher for 42-locale support.
 */
export function Navbar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-50 border-b-2 border-gum-black bg-gum-cream">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          aria-label="Elixio — home"
          className="flex items-center gap-2 rounded-full bg-gum-black px-3 py-1.5 text-white"
        >
          <Image
            src="/elixio-mark.svg"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8"
          />
          <span className="text-xl font-extrabold tracking-tight text-white">{t("common.app_name")}</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-gum-mint px-3 py-1 text-xs font-bold uppercase tracking-wide text-gum-black">
            {t("nav.buyer_tag")}
          </span>
          <NavbarLink href="/explore" accent="bg-gum-pink" textColor="text-gum-black">
            {t("nav.explore")}
          </NavbarLink>
          <NavbarLink href="/library" accent="bg-gum-cream" textColor="text-gum-black">
            {t("nav.library")}
          </NavbarLink>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-gum-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-gum-black">
            {t("nav.creator_tag")}
          </span>
          <NavbarLink href="/dashboard" accent="bg-gum-yellow" textColor="text-gum-black">
            {t("nav.dashboard")}
          </NavbarLink>
          <NavbarLink href="/sell" accent="bg-gum-cyan" textColor="text-gum-black">
            {t("nav.start_selling")}
          </NavbarLink>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link
            href="/auth/login"
            className="rounded-full border-2 border-gum-black px-4 py-2 text-sm font-semibold text-gum-black hover:bg-gum-mint"
          >
            {t("nav.sign_in")}
          </Link>
          <SignupDropdown />
        </div>
      </nav>
    </header>
  );
}

/**
 * "Get Started" dropdown. Two quick-pick options (Buyer / Creator)
 * plus a "See both options" link to the chooser.
 */
function SignupDropdown() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside / Escape to close — keep the markup minimal.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border-2 border-gum-black bg-gum-purple px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a50e6]"
      >
        {t("nav.get_started")}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M2 4 L6 8 L10 4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-2xl border-2 border-gum-black bg-gum-cream shadow-[0_6px_0_0_#111]"
        >
          <div className="p-2">
            <Link
              href="/auth/register/buyer"
              role="menuitem"
              className="flex items-start gap-3 rounded-xl p-3 transition-transform hover:-translate-y-0.5 hover:bg-gum-cream"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-gum-black bg-gum-cyan text-xs font-bold"
              >
                ✓
              </span>
              <span className="flex-1">
                <span className="block text-sm font-extrabold leading-tight">
                  {t("auth.register_buyer_title")}
                </span>
                <span className="mt-0.5 block text-xs ink-muted">
                  {t("asset.description")}
                </span>
              </span>
            </Link>
            <Link
              href="/auth/register/creator"
              role="menuitem"
              className="flex items-start gap-3 rounded-xl p-3 transition-transform hover:-translate-y-0.5 hover:bg-gum-cream"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 border-gum-black bg-gum-yellow text-xs font-bold"
              >
                ✓
              </span>
              <span className="flex-1">
                <span className="block text-sm font-extrabold leading-tight">
                  {t("auth.register_creator_title")}
                </span>
                <span className="mt-0.5 block text-xs ink-muted">
                  {t("sell.subtitle")}
                </span>
              </span>
            </Link>
            <hr className="my-2 border-t-2 border-gum-black/10" />
            <Link
              href="/auth/register"
              role="menuitem"
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-gum-black hover:bg-gum-mint"
            >
              {t("auth.create_account")} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NavbarLink({
  href,
  accent,
  textColor = "text-gum-black",
  children,
}: {
  href: string;
  accent: string;
  textColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border-2 border-gum-black px-4 py-2 text-sm font-semibold shadow-[0_3px_0_0_#111] transition-transform active:translate-y-[3px] active:shadow-none ${accent} ${textColor}`}
    >
      {children}
    </Link>
  );
}