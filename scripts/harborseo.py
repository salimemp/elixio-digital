#!/usr/bin/env -S python3 -u
"""
HarborSEO → Elixio blog publisher.

Pipeline:
  1. Generate an article via HarborSEO (POST /v1/articles with site_id + keywords)
  2. Poll GET /v1/articles/{id} until status == "completed"
  3. Fetch the article HTML content
  4. Slugify the title, write to apps/web/content/blog/{slug}.html with YAML frontmatter
  5. Print a summary so the operator can `git add . && git commit && vercel deploy`

Usage:
  python scripts/harborseo.py [COMMAND]

Commands:
  generate [keywords]    Generate ONE article (defaults to the next queued topic)
  generate-batch N        Generate N articles in series
  poll <article_id>       Poll a specific article until done
  list                    List all Elixio articles in HarborSEO
  sites                   List sites in HarborSEO
  status                  Quick account + quota overview
  publish <article_id>    Pull completed article and write to content/blog/
  publish-all             Publish all completed Elixio articles (skips already-published)
  topics                  Show the queued topic list

Configuration (env):
  HARBORSEO_API_TOKEN     required (the hrb_live_... token)
  ELIXIO_SITE_ID          default: nd716f7ks0dm2hbssynge2162189fgyj

The Elixio site is already registered. The keywords for the Elixio site
have been set to: gumroad alternative, lemon squeezy alternative, payhip
alternative, sell digital products, creator marketplace, procreate brushes,
notion templates, 3d models, fonts, ui kits, sell code online, etc.

We pre-queue topics here. Each call to `generate` picks the next topic
from the queue that hasn't been published yet. After all queued topics
are done, the script exits and the operator can add more topics.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

# ---------------------------------------------------------------------------
#  Config
# ---------------------------------------------------------------------------

HARBOR_BASE = "https://outgoing-oyster-428.convex.site/v1"
DEFAULT_SITE_ID = "nd716f7ks0dm2hbssynge2162189fgyj"  # elixiodigital.com
BLOG_DIR = Path("apps/web/content/blog")

# Pre-queued SEO topic list. Each one targets a high-intent search query
# for the Elixio creator-marketplace.
TOPICS = [
    {
        "id": "vs-gumroad-2026",
        "title": "Elixio vs Gumroad (2026): Honest Fee Comparison + Migration Guide",
        "keywords": "gumroad alternative, gumroad fees, gumroad vs elixio, gumroad vs lemonsqueezy, sell digital products",
    },
    {
        "id": "vs-lemon-squeezy-2026",
        "title": "Elixio vs Lemon Squeezy (2026): Which Is Better for Indie Creators?",
        "keywords": "lemon squeezy alternative, lemon squeezy vs gumroad, lemon squeezy fees, sell digital products",
    },
    {
        "id": "vs-payhip-2026",
        "title": "Elixio vs Payhip (2026): Pricing, Features, and Payout Speed Compared",
        "keywords": "payhip alternative, payhip vs gumroad, payhip vs lemonsqueezy, sell digital products",
    },
    {
        "id": "vs-creative-market-2026",
        "title": "Elixio vs Creative Market (2026): Where Should Designers Sell in 2026?",
        "keywords": "creative market alternative, sell design assets, sell fonts, sell ui kits, sell templates",
    },
    {
        "id": "how-to-sell-procreate-brushes-2026",
        "title": "How to Sell Procreate Brushes in 2026 (and Keep 95% of the Revenue)",
        "keywords": "sell procreate brushes, procreate brush pack, sell digital art, sell brushes online",
    },
    {
        "id": "how-to-sell-notion-templates-2026",
        "title": "How to Sell Notion Templates in 2026: A Creator's Guide",
        "keywords": "sell notion templates, notion template marketplace, sell notion, notion side hustle",
    },
    {
        "id": "how-to-sell-3d-models-2026",
        "title": "How to Sell 3D Models in 2026: From Blender to Marketplace",
        "keywords": "sell 3d models, 3d asset marketplace, sell blender models, cgtrader alternative",
    },
    {
        "id": "how-to-sell-figma-templates-2026",
        "title": "How to Sell Figma Templates in 2026: The Creator Playbook",
        "keywords": "sell figma templates, figma template marketplace, sell design assets, sell ui kits",
    },
    {
        "id": "elixio-pricing-explained-2026",
        "title": "How Elixio's Pricing Works (and Why We Charge Less Than Everyone Else)",
        "keywords": "elixio pricing, marketplace fees, sell digital products, platform fees comparison",
    },
    {
        "id": "best-gumroad-alternatives-2026",
        "title": "The 7 Best Gumroad Alternatives in 2026 (Honest Comparison)",
        "keywords": "gumroad alternatives, best gumroad alternatives, gumroad vs lemonsqueezy, sell digital products",
    },
]


# ---------------------------------------------------------------------------
#  HTTP helpers
# ---------------------------------------------------------------------------

def get_token() -> str:
    token = os.environ.get("HARBORSEO_API_TOKEN") or os.environ.get("HARBORSEO_API_KEY")
    if not token:
        sys.exit("HARBORSEO_API_TOKEN (or HARBORSEO_API_KEY) env var is required")
    return token


def harbor(method: str, path: str, body: dict | None = None) -> dict:
    url = urljoin(HARBOR_BASE + "/", path.lstrip("/"))
    data = json.dumps(body).encode() if body is not None else None
    req = Request(
        url,
        method=method,
        data=data,
        headers={
            "Authorization": f"Bearer {get_token()}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def site_id() -> str:
    return os.environ.get("ELIXIO_SITE_ID", DEFAULT_SITE_ID)


# ---------------------------------------------------------------------------
#  Subcommands
# ---------------------------------------------------------------------------

def cmd_status() -> None:
    account = harbor("GET", "/account")
    plan = account.get("plan", "?")
    remaining = account.get("articles_remaining", "?")
    print(f"HarborSEO account")
    print(f"  plan:                 {plan}")
    print(f"  articles remaining:   {remaining}")
    print(f"  Elixio site id:       {site_id()}")


def cmd_sites() -> None:
    data = harbor("GET", "/sites")
    sites = data.get("data", data if isinstance(data, list) else [])
    for s in sites:
        marker = " ★" if s.get("id") == site_id() else ""
        active = " [active]" if s.get("is_active") else ""
        print(f"  {s.get('id')[:8]}  {s.get('name'):<20}  {s.get('domain'):<30}{active}{marker}")


def cmd_list() -> None:
    data = harbor("GET", f"/articles?site_id={site_id()}")
    items = data.get("data", data if isinstance(data, list) else [])
    print(f"Articles for Elixio site: {len(items)} total")
    for a in items[:20]:
        status = a.get("status", "?")
        wc = a.get("word_count", 0)
        print(f"  {a.get('id')[:8]}  [{status:<10}]  {wc:>5}w  {a.get('title', '?')[:60]}")


def cmd_topics() -> None:
    print("Queued topics:")
    published = _published_slugs()
    for i, t in enumerate(TOPICS):
        marker = "✓" if t["id"] in published else "○"
        print(f"  {marker}  {t['id']:<40}  {t['title'][:60]}")
    print(f"\n{len(TOPICS) - len([t for t in TOPICS if t['id'] in published])} of {len(TOPICS)} topics remaining")


def _next_topic() -> dict | None:
    published = _published_slugs()
    for t in TOPICS:
        if t["id"] not in published:
            return t
    return None


def _published_slugs() -> set[str]:
    if not BLOG_DIR.exists():
        return set()
    return {p.stem for p in BLOG_DIR.glob("*.html")}


def _slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text).strip("-")
    return text[:80] or "untitled"


def _frontmatter(post: dict) -> str:
    """Build YAML frontmatter that gray-matter will parse."""
    return (
        "---\n"
        f"title: {json.dumps(post['title'])}\n"
        f"description: {json.dumps(post['description'])}\n"
        f"date: {post['published_at']}\n"
        f"updated: {post['updated_at']}\n"
        f"author: {json.dumps(post.get('author', 'Elixio Team'))}\n"
        f"categories: {json.dumps(post.get('categories', []))}\n"
        f"wordCount: {post.get('word_count', 0)}\n"
        "---\n\n"
    )


def cmd_generate(topic_id: str | None = None) -> str:
    """Generate ONE article. Returns its ID."""
    if topic_id:
        topic = next((t for t in TOPICS if t["id"] == topic_id), None)
        if not topic:
            sys.exit(f"Unknown topic: {topic_id}. Add it to TOPICS first.")
    else:
        topic = _next_topic()
        if not topic:
            sys.exit("No queued topics remaining. Add more to TOPICS in this script.")
        topic_id = topic["id"]

    print(f"Generating article: {topic['title']}")
    body = {
        "site_id": site_id(),
        "title": topic["title"],
        "keywords": topic["keywords"],
    }
    resp = harbor("POST", "/articles", body)
    article = resp.get("data", resp)
    article_id = article.get("id")
    print(f"  → article_id: {article_id}")
    return article_id


def cmd_generate_batch(n: int) -> list[str]:
    """Generate N articles in series, polling each to completion."""
    ids = []
    for _ in range(n):
        topic = _next_topic()
        if not topic:
            print("No more queued topics.")
            break
        try:
            aid = cmd_generate()
            cmd_poll(aid)
            ids.append(aid)
        except Exception as e:
            print(f"  FAILED: {e}", file=sys.stderr)
            break
    return ids


def cmd_poll(article_id: str, max_wait: int = 30 * 60) -> dict:
    """Poll article until status == 'completed' or 'failed'. Returns final article."""
    deadline = time.time() + max_wait
    while time.time() < deadline:
        resp = harbor("GET", f"/articles/{article_id}")
        data = resp.get("data", resp)
        status = data.get("status", "?")
        progress = data.get("progress", {})
        step = progress.get("step", 0)
        total = progress.get("total", 0)
        msg = progress.get("message", "")
        print(f"  [{int(time.time()) % 10000:04d}]  {status:<10}  step={step}/{total}  {msg}")
        if status == "completed":
            return data
        if status == "failed":
            err = data.get("error", "unknown")
            sys.exit(f"Article failed: {err}")
        time.sleep(20)
    sys.exit(f"Timed out after {max_wait}s")


def _fetch_article(article_id: str) -> dict:
    resp = harbor("GET", f"/articles/{article_id}")
    return resp.get("data", resp)


def _article_to_blog(article: dict) -> dict:
    """Convert HarborSEO article → blog-post frontmatter + HTML."""
    title = article.get("title", "Untitled")
    content = article.get("content", "")
    word_count = article.get("word_count", 0)

    # Try to pull a description from the first <p> if no description provided
    desc_match = re.search(r"<p>(.*?)</p>", content, flags=re.DOTALL)
    if desc_match:
        description = re.sub(r"<[^>]+>", "", desc_match.group(1)).strip()[:200]
    else:
        description = title

    return {
        "title": title,
        "description": description,
        "published_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "author": "Elixio Team",
        "categories": ["comparison"],
        "word_count": word_count,
        "body_html": content,
    }


def cmd_publish(article_id: str) -> Path | None:
    article = _fetch_article(article_id)
    if article.get("status") != "completed":
        sys.exit(f"Article {article_id} is not completed (status={article.get('status')})")
    blog = _article_to_blog(article)
    slug = _slugify(article.get("title", "untitled"))

    BLOG_DIR.mkdir(parents=True, exist_ok=True)
    out = BLOG_DIR / f"{slug}.html"
    out.write_text(_frontmatter(blog) + blog["body_html"], encoding="utf-8")
    print(f"  → wrote {out} ({out.stat().st_size} bytes, {blog['word_count']} words)")
    return out


def cmd_publish_all() -> list[Path]:
    """Publish all completed Elixio articles that aren't already on disk."""
    data = harbor("GET", f"/articles?site_id={site_id()}")
    items = data.get("data", data if isinstance(data, list) else [])
    published = _published_slugs()
    out = []
    for a in items:
        if a.get("status") != "completed":
            continue
        slug = _slugify(a.get("title", "untitled"))
        if slug in published:
            continue
        try:
            path = cmd_publish(a["id"])
            if path:
                out.append(path)
        except Exception as e:
            print(f"  FAILED {a['id']}: {e}", file=sys.stderr)
    return out


# ---------------------------------------------------------------------------
#  Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="Account + quota overview")
    sub.add_parser("sites", help="List HarborSEO sites")
    sub.add_parser("list", help="List Elixio articles in HarborSEO")
    sub.add_parser("topics", help="Show queued topic list")
    sub.add_parser("publish-all", help="Publish all completed articles not yet on disk")

    p_gen = sub.add_parser("generate", help="Generate one article (next queued, or by id)")
    p_gen.add_argument("topic_id", nargs="?", help="Optional topic id from TOPICS")

    p_batch = sub.add_parser("generate-batch", help="Generate N articles in series")
    p_batch.add_argument("n", type=int)

    p_poll = sub.add_parser("poll", help="Poll an article to completion")
    p_poll.add_argument("article_id")

    p_pub = sub.add_parser("publish", help="Publish a completed article to content/blog/")
    p_pub.add_argument("article_id")

    args = parser.parse_args()

    {
        "status": cmd_status,
        "sites": cmd_sites,
        "list": cmd_list,
        "topics": cmd_topics,
        "generate": lambda: cmd_generate(args.topic_id),
        "generate-batch": lambda: cmd_generate_batch(args.n),
        "poll": lambda: cmd_poll(args.article_id),
        "publish": lambda: cmd_publish(args.article_id),
        "publish-all": cmd_publish_all,
    }[args.cmd]()


if __name__ == "__main__":
    main()
