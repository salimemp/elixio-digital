"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-client";
import { Avatar } from "./Avatar";

/**
 * Profile page shell. Shared left-rail navigation + main content area.
 * Used by /profile, /profile/account, /profile/security, /profile/privacy,
 * /profile/notifications, /profile/delete.
 */

export interface ProfileShellProps {
  user: {
    displayName: string;
    email: string;
    avatarUrl?: string | null;
    isCreator?: boolean;
    isAdmin?: boolean;
  };
  children: React.ReactNode;
}

const SECTIONS: ReadonlyArray<{ href: string; labelKey: string; exact?: boolean }> = [
  { href: "/profile", labelKey: "profile.nav.overview", exact: true },
  { href: "/profile/account", labelKey: "profile.nav.account" },
  { href: "/profile/security", labelKey: "profile.nav.security" },
  { href: "/profile/notifications", labelKey: "profile.nav.notifications" },
  { href: "/profile/privacy", labelKey: "profile.nav.privacy" },
];

export function ProfileShell({ user, children }: ProfileShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[260px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        {/* User card */}
        <div className="gum-card mb-4 flex items-center gap-3 p-4">
          <Avatar name={user.displayName} url={user.avatarUrl} size={48} ring />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold ink-default">
              {user.displayName}
            </p>
            <p className="truncate text-xs ink-muted">{user.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1" aria-label="Profile sections">
          {SECTIONS.map((s) => {
            const isActive = s.exact
              ? pathname === s.href
              : pathname === s.href || pathname.startsWith(s.href + "/");
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-gum-yellow text-gum-black"
                    : "ink-default hover:bg-gum-mint"
                }`}
              >
                {t(s.labelKey)}
              </Link>
            );
          })}

          {/* Danger zone: separate visual treatment */}
          <Link
            href="/profile/delete"
            aria-current={pathname === "/profile/delete" ? "page" : undefined}
            className={`mt-4 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
              pathname === "/profile/delete"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gum-black/20 text-red-700 hover:border-red-600 hover:bg-red-50"
            }`}
          >
            {t("profile.nav.delete")}
          </Link>
        </nav>
      </aside>

      <main>{children}</main>
    </div>
  );
}

/**
 * Section heading used inside profile sub-pages.
 */
export function SectionHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-extrabold ink-default">{title}</h1>
      {description && (
        <p className="mt-1 text-sm ink-muted">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}

/**
 * Card container for individual settings blocks.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="gum-card mb-4 p-5">
      <h2 className="mb-1 text-lg font-extrabold ink-default">{title}</h2>
      {description && (
        <p className="mb-3 text-sm ink-muted">{description}</p>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 border-t border-gum-black/10 pt-4">{footer}</div>
      )}
    </section>
  );
}