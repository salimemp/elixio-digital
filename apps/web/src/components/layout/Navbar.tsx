import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-gum-black bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          aria-label="Elixio Digital — home"
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
          <span className="text-xl font-extrabold tracking-tight">Elixio</span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-gum-mint px-3 py-1 text-xs font-bold uppercase tracking-wide text-gum-black">
            Buyer
          </span>
          <NavbarLink href="/explore" accent="bg-gum-pink">
            Explore
          </NavbarLink>
          <NavbarLink href="/library" accent="bg-white">
            Library
          </NavbarLink>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-full bg-gum-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-gum-black">
            Creator
          </span>
          <NavbarLink href="/dashboard" accent="bg-gum-yellow">
            Dashboard
          </NavbarLink>
          <NavbarLink href="/sell" accent="bg-gum-cyan">
            Start Selling
          </NavbarLink>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-full border-2 border-gum-black px-4 py-2 text-sm font-semibold hover:bg-gum-cream"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full border-2 border-gum-black bg-gum-purple px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a50e6]"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavbarLink({
  href,
  accent,
  children,
}: {
  href: string;
  accent: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border-2 border-gum-black px-4 py-2 text-sm font-semibold shadow-[0_3px_0_0_#111] transition-transform active:translate-y-[3px] active:shadow-none ${accent}`}
    >
      {children}
    </Link>
  );
}
