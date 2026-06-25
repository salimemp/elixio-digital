import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ff90e8,_#fffdf5_40%)] px-6 py-20 text-center">
      <span className="mb-6 inline-block rounded-full border-2 border-gum-black bg-gum-yellow px-4 py-1 text-sm font-bold uppercase tracking-wide">
        Creator-first marketplace
      </span>
      <h1 className="mb-6 max-w-4xl text-5xl font-extrabold leading-tight text-gum-black md:text-7xl">
        Sell your digital work{" "}
        <span className="text-gum-purple">without the headaches.</span>
      </h1>
      <p className="mb-10 max-w-2xl text-xl text-gray-700">
        Elixio is the playful, creator-owned marketplace where designers,
        developers, and artists showcase, market, and sell digital assets.
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/explore" className="gum-btn-primary text-lg">
          Discover assets
        </Link>
        <Link href="/sell" className="gum-btn-yellow text-lg">
          Start selling
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureCard color="bg-gum-pink" title="Showcase" text="Build a branded storefront that feels like you." />
        <FeatureCard color="bg-gum-cyan" title="Market" text="Reach buyers with search, collections, and shareable links." />
        <FeatureCard color="bg-gum-mint" title="Sell" text="Checkout, licensing, and instant delivery handled." />
      </div>
    </main>
  );
}

function FeatureCard({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <div className="gum-card max-w-xs">
      <div className={`mb-4 inline-block rounded-full border-2 border-gum-black px-3 py-1 text-xs font-bold uppercase ${color}`}>
        {title}
      </div>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}
