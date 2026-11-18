import { NextRequest, NextResponse } from "next/server";
import { critiqueUiSchema } from "@/lib/genui/critique";
import {
  attachCritiqueToRevision,
  loadRevision,
  loadRun,
} from "@/lib/genui/stores/run-store";
import type { BrowserCritiqueFindings } from "@/lib/genui/types";
import {
  assertGenuiRunOwner,
  guardGenui,
  withGenuiGuardCookies,
} from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      revisionId?: string;
      /** Force rules-only (honest local path) */
      rulesOnly?: boolean;
      browserFindings?: BrowserCritiqueFindings | null;
      referenceImages?: Array<{ dataUrl?: string }>;
    };

    const revisionId = (body.revisionId || "").trim();
    if (!revisionId) {
      return NextResponse.json(
        { error: "revisionId is required" },
        { status: 400 }
      );
    }

    const rev = await loadRevision(revisionId);
    if (!rev) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }
    const run = await loadRun(rev.runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const rulesOnly =
      Boolean(body.rulesOnly) || run.model.mode === "fixture";
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: rulesOnly,
      costly: !rulesOnly,
    });
    if (!guard.ok) return guard.response;
    if (!assertGenuiRunOwner(run.ownerKey, guard.ownerKey)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const browserFindings =
      body.browserFindings &&
      typeof body.browserFindings === "object" &&
      typeof body.browserFindings.containerWidth === "number"
        ? {
            viewport: String(body.browserFindings.viewport || "desktop"),
            containerWidth: Number(body.browserFindings.containerWidth) || 0,
            containerHeight: Number(body.browserFindings.containerHeight) || 0,
            overflowNodeIds: Array.isArray(body.browserFindings.overflowNodeIds)
              ? body.browserFindings.overflowNodeIds.map(String).slice(0, 40)
              : [],
            clippedNodeIds: Array.isArray(body.browserFindings.clippedNodeIds)
              ? body.browserFindings.clippedNodeIds.map(String).slice(0, 40)
              : [],
            notes: Array.isArray(body.browserFindings.notes)
              ? body.browserFindings.notes.map(String).slice(0, 12)
              : [],
          }
        : null;

    const critique = await critiqueUiSchema({
      schema: rev.schema,
      intent: rev.intentSnapshot,
      prompt: rev.promptSnapshot || run.prompt,
      revisionId: rev.id,
      allowLlm: !rulesOnly,
      browserFindings,
      referenceImages: Array.isArray(body.referenceImages)
        ? body.referenceImages
            .filter((x) => x?.dataUrl?.startsWith("data:image/"))
            .map((x) => ({ dataUrl: String(x.dataUrl) }))
            .slice(0, 4)
        : undefined,
    });

    if (rulesOnly) {
      // Keep browser tag if present; never claim LLM
      critique.sources = (critique.sources || ["schema-rules"]).filter(
        (s) => s !== "llm" && s !== "vlm"
      );
      if (!critique.sources.includes("schema-rules")) {
        critique.sources.unshift("schema-rules");
      }
      critique.source = critique.sources.includes("browser")
        ? "rules+browser"
        : "rules";
      delete critique.model;
    }

    const detail = await attachCritiqueToRevision(rev.id, critique, "evaluated");
    return withGenuiGuardCookies(
      guard,
      NextResponse.json({
        critique,
        ...detail,
        meta: {
          source: critique.source,
          sources: critique.sources,
          note:
            critique.source === "rules"
              ? "Deterministic schema-rule critique (no fabricated LLM/VLM scores)."
              : `Critique sources: ${critique.sources.join(", ")}.`,
        },
      })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Critique failed" },
      { status: 500 }
    );
  }
}
