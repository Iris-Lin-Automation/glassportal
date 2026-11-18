import { NextRequest, NextResponse } from "next/server";
import { GENUI_STYLES, type GenuiStyle } from "@/config/genui";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import {
  analyzeReferenceImages,
  normalizeReferenceImages,
} from "@/lib/genui/reference-vision";
import { REFERENCE_MODES, type ReferenceMode } from "@/lib/genui/types";
import { guardGenui, withGenuiGuardCookies } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      style?: string;
      fixture?: boolean;
      referenceMode?: string;
      referenceImages?: unknown;
    };
    const useFixture = Boolean(body.fixture);
    const refs = normalizeReferenceImages(body.referenceImages);
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: useFixture && refs.length === 0,
      costly: !useFixture || refs.length > 0,
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

    const referenceMode: ReferenceMode = REFERENCE_MODES.includes(
      body.referenceMode as ReferenceMode
    )
      ? (body.referenceMode as ReferenceMode)
      : "full";

    let visualAnalysis = undefined as
      | Awaited<ReturnType<typeof analyzeReferenceImages>>["analysis"]
      | undefined;
    let visionNote: string | undefined;

    if (refs.length > 0) {
      if (useFixture) {
        visualAnalysis = {
          source: "unavailable",
          notes:
            "Fixture/heuristic intent path does not run vision on images.",
        };
        visionNote = visualAnalysis.notes;
      } else {
        const analyzed = await analyzeReferenceImages({
          images: refs,
          mode: referenceMode,
          prompt,
        });
        visualAnalysis = analyzed.analysis;
        visionNote = analyzed.error || analyzed.analysis.notes;
      }
    }

    const result = await parseDesignIntent(prompt, {
      style,
      preferLlm: !useFixture,
      referenceMode: refs.length ? referenceMode : undefined,
      visualAnalysis,
    });
    return withGenuiGuardCookies(
      guard,
      NextResponse.json({
        ...result,
        vision: refs.length
          ? {
              imageCount: refs.length,
              mode: referenceMode,
              analysis: visualAnalysis,
              note: visionNote,
            }
          : null,
      })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Intent parse failed" },
      { status: 500 }
    );
  }
}
