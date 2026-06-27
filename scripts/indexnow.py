#!/usr/bin/env -S python3 -u
"""
IndexNow submission for Elixio Digital.

Submits URLs to the IndexNow API (https://api.indexnow.org/indexnow) so
Bing, Yandex, Seznam, and Naver re-crawl within minutes instead of days.

IndexNow protocol:
  POST https://api.indexnow.org/indexnow
  Content-Type: application/json
  {
    "host": "elixiodigital.com",
    "key":  "<32-char hex>",
    "keyLocation": "https://elixiodigital.com/<key>.txt",
    "urlList": ["https://elixiodigital.com/blog/foo", ...]
  }

Setup (one-time):
  1. Generate a key: openssl rand -hex 16
  2. Save it to ~/.mavis/secrets/indexnow/INDEXNOW_KEY
  3. Host the key at https://<your-domain>/<key>.txt
     (already done — apps/web/public/<key>.txt)
  4. Submit URLs with this script

Usage:
  python3 scripts/indexnow.py submit-urls URL [URL ...]
  python3 scripts/indexnow.py submit-sitemap
  python3 scripts/indexnow.py submit-blog
  python3 scripts/indexnow.py submit-all           # sitemap + every blog post

Env:
  INDEXNOW_KEY            (or read from ~/.mavis/secrets/indexnow/INDEXNOW_KEY)
  ELIXIO_SITE_URL         default: https://elixiodigital.com
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
SITE_URL = os.environ.get("ELIXIO_SITE_URL", "https://elixiodigital.com")
BLOG_DIR = Path("apps/web/content/blog")


def get_key() -> str:
    key = os.environ.get("INDEXNOW_KEY")
    if not key:
        path = Path.home() / ".mavis/secrets/indexnow/INDEXNOW_KEY"
        if path.exists():
            key = path.read_text().strip()
    if not key:
        sys.exit("INDEXNOW_KEY not set and ~/.mavis/secrets/indexnow/INDEXNOW_KEY not found")
    return key


def submit(urls: list[str]) -> tuple[int, str]:
    if not urls:
        return 0, "(no URLs to submit)"
    key = get_key()
    host = SITE_URL.split("//", 1)[1].rstrip("/")
    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"{SITE_URL.rstrip('/')}/{key}.txt",
        "urlList": urls,
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            code = resp.getcode()
            body = resp.read().decode(errors="replace")
            return code, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")
    except urllib.error.URLError as e:
        return 0, f"URLError: {e.reason}"


def get_blog_urls() -> list[str]:
    if not BLOG_DIR.exists():
        return []
    urls = []
    for f in sorted(BLOG_DIR.glob("*.html")):
        slug = f.stem
        urls.append(f"{SITE_URL.rstrip('/')}/blog/{slug}")
    return urls


def get_static_urls() -> list[str]:
    base = SITE_URL.rstrip("/")
    return [
        f"{base}/",
        f"{base}/blog",
        f"{base}/explore",
        f"{base}/sell",
        f"{base}/library",
        f"{base}/dashboard",
        f"{base}/about",
        f"{base}/pricing",
    ]


def cmd_submit_urls(urls: list[str]) -> None:
    if not urls:
        sys.exit("No URLs to submit")
    print(f"Submitting {len(urls)} URL(s) to IndexNow…")
    code, body = submit(urls)
    print(f"  HTTP {code}")
    if body:
        print(f"  {body.strip()[:500]}")
    if 200 <= code < 300:
        print("  ✓ submitted")
    else:
        sys.exit(f"  ✗ failed (HTTP {code})")


def cmd_submit_sitemap() -> None:
    # Re-submit sitemap URL itself — Bing reads sitemap.xml from here
    sitemap_url = f"{SITE_URL.rstrip('/')}/sitemap.xml"
    print(f"Submitting sitemap URL: {sitemap_url}")
    cmd_submit_urls([sitemap_url])


def cmd_submit_blog() -> None:
    urls = get_blog_urls()
    print(f"Found {len(urls)} blog post(s) in {BLOG_DIR}")
    if not urls:
        sys.exit("No blog posts to submit")
    cmd_submit_urls(urls)


def cmd_submit_all() -> None:
    urls = get_static_urls() + get_blog_urls()
    print(f"Submitting {len(urls)} URLs (static + blog)")
    cmd_submit_urls(urls)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("submit-urls", help="Submit one or more specific URLs")
    p1.add_argument("urls", nargs="+")

    sub.add_parser("submit-sitemap", help="Submit the sitemap.xml URL")
    sub.add_parser("submit-blog", help="Submit all blog post URLs")
    sub.add_parser("submit-all", help="Submit static routes + all blog posts")

    args = parser.parse_args()
    {
        "submit-urls": lambda: cmd_submit_urls(args.urls),
        "submit-sitemap": cmd_submit_sitemap,
        "submit-blog": cmd_submit_blog,
        "submit-all": cmd_submit_all,
    }[args.cmd]()


if __name__ == "__main__":
    main()
