import { CreatorDashboardClient } from "@/components/creator/CreatorDashboardClient";

/**
 * Creator dashboard. Server component shell that hands off to the
 * client component for the interactive panels (analytics, charts,
 * bulk ops launcher). The page itself doesn't pre-fetch data because
 * the JWT lives in localStorage.
 */
export default function CreatorDashboardPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-extrabold text-gum-black">Creator Dashboard</h1>
            <p className="mt-1 text-gum-black">
              Revenue, top assets, conversion, cohort retention.
            </p>
          </div>
          <span className="rounded-full border-2 border-gum-black bg-gum-yellow px-4 py-1 text-sm font-bold uppercase">
            Creator Only
          </span>
        </div>

        <CreatorDashboardClient initialOverview={null} />
      </section>
    </main>
  );
}