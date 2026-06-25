import Link from "next/link";

export default function CreatorDashboardPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold text-gum-black">Creator Dashboard</h1>
          <span className="rounded-full border-2 border-gum-black bg-gum-yellow px-4 py-1 text-sm font-bold uppercase">
            Creator Only
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="gum-card">
            <h2 className="mb-2 text-xl font-bold">Assets</h2>
            <p className="mb-4 text-gray-700">Create, publish, and manage your digital products.</p>
            <Link href="/sell" className="gum-btn-primary w-full">
              New asset
            </Link>
          </div>
          <div className="gum-card">
            <h2 className="mb-2 text-xl font-bold">Sales</h2>
            <p className="mb-4 text-gray-700">Track revenue, orders, and payouts.</p>
            <span className="text-2xl font-extrabold text-gum-purple">$0.00</span>
          </div>
          <div className="gum-card">
            <h2 className="mb-2 text-xl font-bold">Storefront</h2>
            <p className="mb-4 text-gray-700">Customize your public creator page.</p>
            <Link href="/storefront" className="gum-btn-secondary w-full">
              Edit storefront
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
