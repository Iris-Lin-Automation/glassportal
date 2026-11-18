import { NextRequest, NextResponse } from "next/server";
import { registerAccount } from "@/lib/security/accounts";
import { attachSessionCookie } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const result = await registerAccount({
      email: body.email || "",
      password: body.password || "",
      name: body.name || "",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const res = NextResponse.json({
      ok: true,
      email: result.account.email,
      name: result.account.name,
    });
    return attachSessionCookie(res, result.account.email);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Register failed" },
      { status: 500 }
    );
  }
}
