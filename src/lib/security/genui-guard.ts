import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/security/studio-session";

const hits = new Map<string, { n: number; reset: number }>();
export const ANON_COOKIE = "gp_anon";

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

function readOrMintAnonId(req: NextRequest): { id: string; setCookie: boolean } {
  const existing = req.cookies.get(ANON_COOKIE)?.value?.trim();
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    return { id: existing, setCookie: false };
  }
  return { id: randomBytes(16).toString("base64url"), setCookie: true };
}

export function assertGenuiRunOwner(
  runOwnerKey: string,
  guardOwnerKey: string
): boolean {
  return Boolean(runOwnerKey) && runOwnerKey === guardOwnerKey;
}

export function attachAnonCookie(res: NextResponse, anonId: string) {
  res.cookies.set(ANON_COOKIE, anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export function guardGenui(
  req: NextRequest,
  opts: { allowAnonymousFixture?: boolean; fixture?: boolean; costly?: boolean }
):
  | {
      ok: true;
      ownerKey: string;
      email: string | null;
      anonId?: string;
      setAnonCookie?: boolean;
    }
  | { ok: false; response: NextResponse } {
  const email = getSessionEmail(req);
  const ip = clientIp(req);

  if (!email) {
    if (opts.allowAnonymousFixture && opts.fixture && !opts.costly) {
      if (
        !rateLimit("anon:global", 120, 60_000) ||
        !rateLimit(`anon-ip:${ip}`, 20, 60_000)
      ) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: "Rate limit exceeded" },
            { status: 429 }
          ),
        };
      }
      const anon = readOrMintAnonId(req);
      return {
        ok: true,
        ownerKey: `anon:${anon.id}`,
        email: null,
        anonId: anon.id,
        setAnonCookie: anon.setCookie,
      };
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

/** Wrap JSON response and set anon cookie when needed. */
export function withGenuiGuardCookies(
  guard: {
    ok: true;
    anonId?: string;
    setAnonCookie?: boolean;
  },
  res: NextResponse
) {
  if (guard.setAnonCookie && guard.anonId) {
    attachAnonCookie(res, guard.anonId);
  }
  return res;
}
