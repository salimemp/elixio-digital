/**
 * IP geolocation — used at login to detect new countries/cities and
 * alert the user. Backed by ipapi.co (free tier, 30k req/month, no key).
 *
 * We cache results in-process for 7 days to avoid hammering the API and
 * to make the login path fast (single dict lookup). The cache is
 * deliberately per-process; if you scale to multiple Railway instances
 * this becomes a per-instance cache, which is fine for our volume.
 *
 * ipapi.co response shape:
 *   { ip, city, region, country_name, country_code, latitude, longitude, ... }
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REQUEST_TIMEOUT_MS = 1500;

export type GeoLocation = {
  ip: string;
  city: string | null;
  region: string | null;
  country: string; // full country name
  countryCode: string; // ISO 3166-1 alpha-2 (e.g. "IN")
  latitude: number | null;
  longitude: number | null;
};

type CacheEntry = { result: GeoLocation; expires: number };
const cache = new Map<string, CacheEntry>();

/** Internal IPs (loopback, RFC 1918, link-local) — never query these. */
const isPrivateIp = (ip: string): boolean => {
  if (!ip) return true;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "0:0:0:0:0:0:0:1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fe80:")) return true;
  return false;
};

const cleanIp = (ip: string): string => {
  // Strip the IPv6-mapped-IPv4 prefix (e.g. "::ffff:1.2.3.4" -> "1.2.3.4")
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return m ? m[1] : ip;
};

/**
 * Look up the geographic location of an IP. Returns null on:
 *   - private/local IPs (loopback, RFC 1918)
 *   - network errors / timeouts (fail open)
 *   - rate-limit responses (caches the failure briefly)
 */
export const lookupGeo = async (ip: string): Promise<GeoLocation | null> => {
  const cleaned = cleanIp(ip);
  if (!cleaned || isPrivateIp(cleaned)) return null;

  const cached = cache.get(cleaned);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(
        `https://ipapi.co/${encodeURIComponent(cleaned)}/json/`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // ipapi.co returns 429 on rate-limit. Cache a short negative
      // result so we don't hammer the API.
      if (res.status === 429) {
        cache.set(cleaned, {
          result: { ip: cleaned, city: null, region: null, country: "Unknown", countryCode: "??", latitude: null, longitude: null },
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
      }
      return null;
    }

    const data = await res.json();
    if (data.error) {
      // ipapi.co returns 200 + { error: true } for invalid IPs
      return null;
    }

    const result: GeoLocation = {
      ip: cleaned,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || "Unknown",
      countryCode: data.country_code || "??",
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    };
    cache.set(cleaned, { result, expires: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    // Network error / timeout — fail open, return null.
    return null;
  }
};

/**
 * Format a GeoLocation for the user. Used in the security-alert email
 * and in the /auth/me security-events list.
 */
export const formatLocation = (geo: GeoLocation | null): string => {
  if (!geo) return "Unknown location";
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : geo.country;
};
