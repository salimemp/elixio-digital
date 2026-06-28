import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";
import { feedConfig } from "@/lib/feeds/feed-source";

export const dynamic = "force-dynamic";

export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  return getAllPostSlugs().map((slug) => ({ slug }));
};

export const generateMetadata = async ({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> => {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post not found" };

  const canonical = `${feedConfig.siteUrl}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: canonical.replace(feedConfig.siteUrl, "") },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: canonical,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.categories,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// JSON-LD structured data for SEO + AI search engines
const articleJsonLd = (post: NonNullable<ReturnType<typeof getPostBySlug>>) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.description,
  datePublished: post.publishedAt,
  dateModified: post.updatedAt,
  author: { "@type": "Person", name: post.author },
  publisher: {
    "@type": "Organization",
    name: "Elixio",
    url: feedConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${feedConfig.siteUrl}/elixio-mark.svg`,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${feedConfig.siteUrl}/blog/${post.slug}`,
  },
  keywords: post.categories.join(", "),
});

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = articleJsonLd(post);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-8 text-sm font-semibold ink-muted">
        <Link href="/blog" className="hover:text-gum-purple">
          ← All posts
        </Link>
      </nav>

      <article>
        <header className="mb-8 border-b-2 border-gum-black pb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide ink-muted">
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
            {post.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gum-mint px-2 py-0.5 ink-default"
              >
                {cat}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight md:text-5xl">
            {post.title}
          </h1>
          {post.description && (
            <p className="mt-4 text-xl ink-default">{post.description}</p>
          )}
          <p className="mt-4 text-sm ink-muted">
            By <strong>{post.author}</strong>
            {post.wordCount ? ` · ${post.wordCount.toLocaleString()} words` : ""}
          </p>
        </header>

        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: post.html }}
          className="prose prose-lg max-w-none prose-headings:font-extrabold prose-h2:mt-10 prose-h2:text-3xl prose-h3:mt-8 prose-h3:text-2xl prose-a:text-gum-purple prose-a:underline prose-strong:font-bold prose-ul:my-4 prose-li:my-1"
        />
      </article>

      <footer className="mt-16 border-t-2 border-gum-black pt-8">
        <div className="gum-card">
          <h2 className="text-2xl font-extrabold">
            Ready to sell your digital work?
          </h2>
          <p className="mt-2 ink-default">
            Elixio is a creator-first marketplace with the lowest fees in the
            industry. Set up your storefront in under 5 minutes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/sell"
              className="gum-btn-primary"
            >
              Start selling
            </Link>
            <Link
              href="/pricing"
              className="gum-btn-yellow"
            >
              See pricing
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
