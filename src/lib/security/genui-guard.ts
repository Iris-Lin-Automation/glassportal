import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/security/studio-session";

const hits = new Map<string, { n: number; reset: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

/**
 * Prefer the rightmost X-Forwarded-For hop (added by the trusted edge proxy).
 * Never trust the client-supplied leftmost value alone.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertGenuiRunOwner(
  runOwnerKey: string,
  guardOwnerKey: string
): boolean {
  return Boolean(runOwnerKey) && runOwnerKey === guardOwnerKey;
}

export function guardGenui(
  req: NextRequest,
  opts: { allowAnonymousFixture?: boolean; fixture?: boolean; costly?: boolean }
):
  | { ok: true; ownerKey: string; email: string | null }
  | { ok: false; response: NextResponse } {
  const email = getSessionEmail(req);
  const ip = clientIp(req);

  if (!email) {
    if (opts.allowAnonymousFixture && opts.fixture && !opts.costly) {
      // Global + per-IP buckets; IP from trusted proxy hop only.
      if (
        !rateLimit("anon:global", 120, 60_000) ||
        !rateLimit(`anon:${ip}`, 20, 60_000)
      ) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Rate limit exceeded" },
            { status: 429 }
          ),
        };
      }
      return { ok: true, ownerKey: `anon:${ip}`, email: null };
    }
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Sign in required for Generative UI (except local Sample fixtures).",
        },
        { status: 401 }
      ),
    };
  }

  if (!rateLimit(`user:${email}`, opts.costly ? 20 : 60, 60_000)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      ),
    };
  }

  return { ok: true, ownerKey: `user:${email}`, email };
}
