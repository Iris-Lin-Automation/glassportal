import { NextRequest, NextResponse } from "next/server";
import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import { guardGenui, withGenuiGuardCookies } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      style?: string;
      fixture?: boolean;
    };
    const useFixture = Boolean(body.fixture);
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: useFixture,
      costly: !useFixture,
    });
    if (!guard.ok) return guard.response;

    const prompt = (body.prompt || "").trim().slice(0, 4000);
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    const style = GENUI_STYLES.includes(body.style as GenuiStyle)
      ? (body.style as GenuiStyle)
      : undefined;

    // Fixture path: heuristics only — never spend OPENAI_API_KEY.
    const result = await parseDesignIntent(prompt, {
      style,
      preferLlm: !useFixture,
    });
    return withGenuiGuardCookies(guard, NextResponse.json(result));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Intent parse failed" },
      { status: 500 }
    );
  }
}
