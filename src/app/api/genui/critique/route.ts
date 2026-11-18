import { NextRequest, NextResponse } from "next/server";
import { critiqueUiSchema } from "@/lib/genui/critique";
import {
  attachCritiqueToRevision,
  loadRevision,
  loadRun,
} from "@/lib/genui/stores/run-store";
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
    // Anonymous and signed-in callers may only touch their own runs.
    if (!assertGenuiRunOwner(run.ownerKey, guard.ownerKey)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const critique = await critiqueUiSchema({
      schema: rev.schema,
      intent: rev.intentSnapshot,
      prompt: rev.promptSnapshot || run.prompt,
      revisionId: rev.id,
      allowLlm: !rulesOnly,
    });

    // Fixture / rulesOnly → still real rules scores (never fake)
    if (rulesOnly) {
      critique.source = "rules";
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
          note:
            critique.source === "rules"
              ? "Deterministic rule critique (no LLM scores fabricated)."
              : "Merged rule + live LLM critique.",
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
