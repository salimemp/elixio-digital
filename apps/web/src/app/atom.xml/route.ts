import { buildAtom, atomHeaders } from "@/lib/feeds/feed-builder";

/**
 * GET /atom.xml
 *
 * Atom 1.0 feed (RFC 4287). Atom is the IETF standard for syndication
 * and is preferred by some readers (notably some podcast clients and
 * modern aggregators). We ship it alongside RSS so every reader works.
 */
export const GET = (): Response => {
  const body = buildAtom();
  return new Response(body, { headers: atomHeaders() });
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
