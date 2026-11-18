import { NextRequest, NextResponse } from "next/server";
import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { generateUiSchema } from "@/lib/genui/generator";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import { createGeneration } from "@/lib/genui/stores/run-store";
import { guardGenui, withGenuiGuardCookies } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      style?: string;
      ownerKey?: string;
      fixture?: boolean;
    };

    const prompt = (body.prompt || "").trim().slice(0, 4000);
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const useFixture = Boolean(body.fixture);
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: useFixture,
      costly: !useFixture,
    });
    if (!guard.ok) return guard.response;

    const style: GenuiStyle = GENUI_STYLES.includes(body.style as GenuiStyle)
      ? (body.style as GenuiStyle)
      : "modern-saas";

    const ownerKey = guard.ownerKey;

    // Fixture / anonymous sample path must never hit a paid LLM.
    const { intent, source: intentSource } = await parseDesignIntent(prompt, {
      style,
      preferLlm: !useFixture,
    });
    intent.style = style;

    const generated = await generateUiSchema({
      prompt,
      intent,
      style,
      allowFixture: useFixture,
    });

    const detail = await createGeneration({
      ownerKey,
      prompt,
      intent,
      style,
      model: {
        provider: generated.provider,
        name: generated.model,
        mode: generated.mode,
      },
      schema: generated.schema,
      source: generated.mode === "fixture" ? "fixture" : "generate",
      rawHash: generated.rawHash,
      usage: generated.usage,
      status: "generated",
    });

    const res = NextResponse.json({
      ...detail,
      intentSource,
      meta: {
        mode: generated.mode,
        note:
          generated.mode === "fixture"
            ? "Local fixture schema (not an LLM generation)."
            : "Generated via server-side LLM.",
      },
    });
    return withGenuiGuardCookies(guard, res);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 }
    );
  }
}
