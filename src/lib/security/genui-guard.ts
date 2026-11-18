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

export function guardGenui(
  req: NextRequest,
  opts: { allowAnonymousFixture?: boolean; fixture?: boolean; costly?: boolean }
):
  | { ok: true; ownerKey: string; email: string | null }
  | { ok: false; response: NextResponse } {
  const email = getSessionEmail(req);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!email) {
    if (opts.allowAnonymousFixture && opts.fixture && !opts.costly) {
      if (!rateLimit(`anon:${ip}`, 30, 60_000)) {
        return {
          ok: false,
          response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
        };
      }
      return { ok: true, ownerKey: `anon:${ip}`, email: null };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in required for Generative UI (except local Sample fixtures)." },
        { status: 401 }
      ),
    };
  }

  if (!rateLimit(`user:${email}`, opts.costly ? 20 : 60, 60_000)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
    };
  }

  return { ok: true, ownerKey: `user:${email}`, email };
}
