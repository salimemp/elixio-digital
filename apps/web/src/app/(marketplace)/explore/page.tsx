import { AssetCard } from "@/components/ui/AssetCard";
import { getAssets, type ApiResult } from "@/lib/api";
import type { Asset, PaginatedResponse } from "@elixio/shared";

export default async function ExplorePage() {
  let result: ApiResult<PaginatedResponse<Asset>>;
  try {
    result = await getAssets();
  } catch {
    result = { ok: false, error: "Unable to load assets" };
  }

  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto mb-10 max-w-7xl rounded-3xl border-2 border-gum-black bg-gum-mint p-8 text-center shadow-gum">
        <h1 className="mb-3 text-4xl font-extrabold text-gum-black md:text-5xl">
          Discover digital assets
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-800">
          Templates, mockups, code, music, and more from independent creators.
        </p>
      </section>

      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full border-2 border-gum-black bg-white px-4 py-2 text-sm font-bold">
            {result.ok ? `${result.data.total} assets` : "0 assets"}
          </span>
        </div>

        {result.ok && result.data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.items.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No assets available right now.</p>
        )}
      </section>
    </main>
  );
}
