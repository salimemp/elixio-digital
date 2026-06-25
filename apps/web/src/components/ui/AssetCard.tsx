import Link from "next/link";
import type { Asset } from "@elixio/shared";

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link href={`/asset/${asset.id}`}>
      <article className="gum-card h-full">
        <div className="mb-3 flex h-40 items-center justify-center rounded-xl border-2 border-gum-black bg-gradient-to-br from-gum-pink via-gum-purple to-gum-cyan">
          <span className="text-4xl">🎨</span>
        </div>
        <h2 className="mb-1 text-lg font-bold text-gum-black">{asset.title}</h2>
        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{asset.description}</p>
        <div className="flex items-center justify-between">
          <span className="gum-pill">
            {(asset.priceCents / 100).toFixed(2)} {asset.currency}
          </span>
          <span className="text-xs font-bold text-gum-purple">{asset.status}</span>
        </div>
      </article>
    </Link>
  );
}
