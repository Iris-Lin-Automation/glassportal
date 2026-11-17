import { NextRequest, NextResponse } from "next/server";
import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { generateUiSchema } from "@/lib/genui/generator";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import { createGeneration } from "@/lib/genui/stores/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      style?: string;
      ownerKey?: string;
      /** Use local fixture instead of LLM (honest sample mode) */
      fixture?: boolean;
    };

    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const style: GenuiStyle = GENUI_STYLES.includes(body.style as GenuiStyle)
      ? (body.style as GenuiStyle)
      : "modern-saas";

    const ownerKey = (body.ownerKey || "anon").trim() || "anon";
    const useFixture = Boolean(body.fixture);

    const { intent, source: intentSource } = await parseDesignIntent(prompt, {
      style,
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

    return NextResponse.json({
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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 }
    );
  }
}
