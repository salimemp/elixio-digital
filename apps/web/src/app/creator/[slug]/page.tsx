import { getStorefront } from "@/lib/api";

interface CreatorPageProps {
  params: { slug: string };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const result = await getStorefront(params.slug);

  if (!result.ok) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Creator not found</h1>
      </main>
    );
  }

  const storefront = result.data as { slug: string };

  return (
    <main className="p-6">
      <h1 className="mb-4 text-3xl font-bold">{storefront.slug}</h1>
      <p className="text-gum-black">Creator storefront on Elixio Digital.</p>
    </main>
  );
}
