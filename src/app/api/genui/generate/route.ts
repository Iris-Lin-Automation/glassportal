import { NextRequest, NextResponse } from "next/server";
import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { generateUiSchema } from "@/lib/genui/generator";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import {
  analyzeReferenceImages,
  normalizeReferenceImages,
} from "@/lib/genui/reference-vision";
import { createGeneration } from "@/lib/genui/stores/run-store";
import type { ReferenceMode } from "@/lib/genui/types";
import { REFERENCE_MODES } from "@/lib/genui/types";
import { guardGenui, withGenuiGuardCookies } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      style?: string;
      ownerKey?: string;
      fixture?: boolean;
      referenceMode?: string;
      referenceImages?: unknown;
    };

    const prompt = (body.prompt || "").trim().slice(0, 4000);
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const useFixture = Boolean(body.fixture);
    const refs = normalizeReferenceImages(body.referenceImages);
    const referenceMode: ReferenceMode = REFERENCE_MODES.includes(
      body.referenceMode as ReferenceMode
    )
      ? (body.referenceMode as ReferenceMode)
      : "full";

    // Reference vision is a costly path even for Sample when images are present
    const costlyVision = refs.length > 0 && !useFixture;
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: useFixture && refs.length === 0,
      costly: !useFixture || costlyVision,
    });
    if (!guard.ok) return guard.response;

    const style: GenuiStyle = GENUI_STYLES.includes(body.style as GenuiStyle)
      ? (body.style as GenuiStyle)
      : "modern-saas";

    const ownerKey = guard.ownerKey;

    let visionNote = "";
    let visualAnalysis = undefined as
      | Awaited<ReturnType<typeof analyzeReferenceImages>>["analysis"]
      | undefined;

    if (refs.length > 0) {
      if (useFixture) {
        // Honest: Sample mode never pretends to see images
        visualAnalysis = {
          source: "unavailable",
          notes:
            "Sample/fixture mode does not run vision. Reference images were ignored for understanding — switch to Generate with a vision model configured.",
        };
        visionNote = visualAnalysis.notes!;
      } else {
        const analyzed = await analyzeReferenceImages({
          images: refs,
          mode: referenceMode,
          prompt,
        });
        visualAnalysis = analyzed.analysis;
        if (analyzed.error) visionNote = analyzed.error;
        else if (analyzed.analysis.source === "unavailable") {
          visionNote =
            analyzed.analysis.notes ||
            "Vision unavailable — images not understood.";
        } else {
          visionNote = `Reference analyzed via VLM (${analyzed.analysis.model || "vision"}).`;
        }
      }
    }

    // Fixture / anonymous sample path must never hit a paid LLM for schema.
    const { intent, source: intentSource } = await parseDesignIntent(prompt, {
      style,
      preferLlm: !useFixture,
      referenceMode: refs.length ? referenceMode : undefined,
      visualAnalysis,
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
      vision: refs.length
        ? {
            imageCount: refs.length,
            mode: referenceMode,
            analysis: visualAnalysis,
            note: visionNote,
          }
        : null,
      meta: {
        mode: generated.mode,
        note:
          generated.mode === "fixture"
            ? `Local fixture schema (not an LLM generation).${visionNote ? ` ${visionNote}` : ""}`
            : `Generated via server-side LLM.${visionNote ? ` ${visionNote}` : ""}`,
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
