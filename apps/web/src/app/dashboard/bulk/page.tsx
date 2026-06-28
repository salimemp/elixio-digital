import { BulkOpsClient } from "@/components/creator/BulkOpsClient";

/**
 * /dashboard/bulk — bulk operations over creator assets. Strict
 * creator-only page. Supports price updates, publish/archive, tag
 * add/remove, and delete. Every non-delete op can be rolled back.
 */
export default function BulkOpsPage() {
  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-extrabold text-gum-black">Bulk operations</h1>
            <p className="mt-1 text-gum-black">
              Update many assets at once. Non-delete operations can be rolled back.
            </p>
          </div>
          <span className="rounded-full border-2 border-gum-black bg-gum-cyan px-4 py-1 text-sm font-bold uppercase">
            Creator Only
          </span>
        </div>

        <BulkOpsClient />
      </section>
    </main>
  );
}