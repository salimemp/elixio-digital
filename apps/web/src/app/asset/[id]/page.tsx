import { getAsset } from "@/lib/api";

interface AssetDetailPageProps {
  params: { id: string };
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const result = await getAsset(params.id);

  if (!result.ok) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Asset not found</h1>
      </main>
    );
  }

  const asset = result.data as { title: string; description: string; priceCents: number; currency: string };

  return (
    <main className="p-6">
      <h1 className="mb-4 text-3xl font-bold">{asset.title}</h1>
      <p className="mb-4 text-gum-black">{asset.description}</p>
      <p className="font-semibold">
        {(asset.priceCents / 100).toFixed(2)} {asset.currency}
      </p>
    </main>
  );
}
