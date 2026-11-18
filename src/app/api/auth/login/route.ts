import { NextRequest, NextResponse } from "next/server";
import { authenticateAccount } from "@/lib/security/accounts";
import { clientIp } from "@/lib/security/genui-guard";
import { attachSessionCookie } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; reset: number }>();

function limited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  if (cur.n >= limit) return true;
  cur.n += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (limited(`login:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const result = await authenticateAccount(body.email || "", body.password || "");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    const res = NextResponse.json({
      ok: true,
      email: result.account.email,
      name: result.account.name,
    });
    return attachSessionCookie(res, result.account.email);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    );
  }
}
