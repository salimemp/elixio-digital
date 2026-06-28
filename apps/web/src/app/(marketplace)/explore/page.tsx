import { AssetCard } from "@/components/ui/AssetCard";
import { getAssets } from "@/lib/api";

export default async function ExplorePage() {
  const result = await getAssets();

  type Asset = {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    currency: string;
  };
  type PaginatedAssets = { items: Asset[]; total: number };
  const data = (result.ok ? result.data : { items: [], total: 0 }) as PaginatedAssets;

  return (
    <main className="min-h-screen bg-gum-cream px-6 py-10">
      <section className="mx-auto mb-10 max-w-7xl rounded-3xl border-2 border-gum-black bg-gum-mint p-8 text-center shadow-gum">
        <h1 className="mb-3 text-4xl font-extrabold ink-default md:text-5xl">
          Discover digital assets
        </h1>
        <p className="mx-auto max-w-2xl text-lg ink-default">
          Templates, mockups, code, music, and more from independent creators.
        </p>
      </section>

      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full border-2 border-gum-black bg-gum-cream px-4 py-2 text-sm font-bold">
            {`${data.total} assets`}
          </span>
        </div>

        {data.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={{
                  id: asset.id,
                  title: asset.title,
                  description: asset.description,
                  priceCents: asset.priceCents,
                  currency: asset.currency,
                  creatorId: "",
                  slug: "",
                  categoryId: "",
                  licenseId: "",
                  status: "published",
                  avgRating: null,
                  reviewCount: 0,
                  salesCount: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }}
              />
            ))}
          </div>
        ) : (
          <p className="ink-muted">No assets available right now.</p>
        )}
      </section>
    </main>
  );
}
