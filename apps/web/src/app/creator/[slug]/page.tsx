import { getStorefront, type ApiResult } from "@/lib/api";
import type { Storefront } from "@elixio/shared";

interface CreatorPageProps {
  params: { slug: string };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  let result: ApiResult<Storefront>;
  try {
    result = await getStorefront(params.slug);
  } catch {
    result = { ok: false, error: "Unable to load storefront" };
  }

  if (!result.ok) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Creator not found</h1>
      </main>
    );
  }

  const storefront = result.data;

  return (
    <main className="p-6">
      <h1 className="mb-4 text-3xl font-bold">{storefront.slug}</h1>
      <p className="text-gray-700">Creator storefront on Elixio Digital.</p>
    </main>
  );
}
