import { getAsset, type ApiResult } from "@/lib/api";
import type { AssetDetail } from "@elixio/shared";

interface AssetDetailPageProps {
  params: { id: string };
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  let result: ApiResult<AssetDetail>;
  try {
    result = await getAsset(params.id);
  } catch {
    result = { ok: false, error: "Unable to load asset" };
  }

  if (!result.ok) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Asset not found</h1>
      </main>
    );
  }

  const asset = result.data;

  return (
    <main className="p-6">
      <h1 className="mb-4 text-3xl font-bold">{asset.title}</h1>
      <p className="mb-4 text-gray-700">{asset.description}</p>
      <p className="font-semibold">
        {(asset.priceCents / 100).toFixed(2)} {asset.currency}
      </p>
    </main>
  );
}
