import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { feedConfig } from "@/lib/feeds/feed-source";

export const dynamic = "force-dynamic"; // re-reads content/blog on each request

export const metadata: Metadata = {
  title: "Blog — Creator guides, comparisons, and marketplace news",
  description:
    "Long-form guides for digital creators: how to sell templates, design files, code, music, 3D models and more. Plus honest comparisons of Gumroad, Lemon Squeezy, Payhip, and other creator-marketplace platforms.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Elixio Blog",
    description:
      "Long-form guides for digital creators: how to sell, what to sell, and where to sell it.",
    type: "website",
    url: `${feedConfig.siteUrl}/blog`,
  },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-12">
        <span className="inline-block rounded-full border-2 border-gum-black bg-gum-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide">
          Blog
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight md:text-6xl">
          Guides for{" "}
          <span className="text-gum-purple">digital creators</span>
        </h1>
        <p className="mt-4 max-w-2xl text-xl text-gray-700">
          How to sell your digital work, what platforms pay creators the most,
          and how to grow an audience that buys. Updated weekly.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-gum-black bg-white p-8 text-center text-gray-600">
          No posts yet — check back soon.
        </p>
      ) : (
        <ul className="space-y-8">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="gum-card">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-600">
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                  {post.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-gum-mint px-2 py-0.5 text-gum-black"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-gum-purple"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-gray-700">{post.excerpt}</p>
                <div className="mt-4">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block rounded-full border-2 border-gum-black bg-white px-4 py-2 text-sm font-bold shadow-[0_3px_0_0_#111] transition-transform active:translate-y-[3px] active:shadow-none hover:bg-gum-cream"
                  >
                    Read post →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
