import { NextRequest, NextResponse } from "next/server";
import { critiqueUiSchema } from "@/lib/genui/critique";
import { reviseUiSchema } from "@/lib/genui/revision";
import {
  appendRevision,
  attachCritiqueToRevision,
  loadRevision,
  loadRun,
} from "@/lib/genui/stores/run-store";
import { guardGenui } from "@/lib/security/genui-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      revisionId?: string;
      notes?: string;
      /** Use local deterministic revise (fixture / offline) */
      local?: boolean;
      /** Re-critique after revise */
      critiqueAfter?: boolean;
    };

    const revisionId = (body.revisionId || "").trim();
    if (!revisionId) {
      return NextResponse.json(
        { error: "revisionId is required" },
        { status: 400 }
      );
    }

    const parent = await loadRevision(revisionId);
    if (!parent) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }
    const run = await loadRun(parent.runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const useLocal = Boolean(body.local) || run.model.mode === "fixture";
    const guard = guardGenui(req, {
      allowAnonymousFixture: true,
      fixture: useLocal,
      costly: !useLocal,
    });
    if (!guard.ok) return guard.response;
    if (guard.email && run.ownerKey !== guard.ownerKey && !run.ownerKey.startsWith("anon:")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let critique = parent.critique;
    if (!critique) {
      critique = await critiqueUiSchema({
        schema: parent.schema,
        intent: parent.intentSnapshot,
        prompt: parent.promptSnapshot || run.prompt,
        revisionId: parent.id,
        allowLlm: !body.local && run.model.mode !== "fixture",
      });
    }

    const revised = await reviseUiSchema({
      prompt: parent.promptSnapshot || run.prompt,
      intent: parent.intentSnapshot,
      style: run.style,
      schema: parent.schema,
      critique,
      notes: body.notes,
      allowLocal: useLocal,
    });

    let detail = await appendRevision({
      runId: run.id,
      parentRevisionId: parent.id,
      schema: revised.schema,
      source: "revise",
      promptSnapshot: parent.promptSnapshot || run.prompt,
      intentSnapshot: parent.intentSnapshot,
      rawHash: revised.rawHash,
      usage: revised.usage,
      revisionNotes: revised.notes,
      status: "revised",
    });

    const current = detail.current;
    if (current && body.critiqueAfter !== false) {
      const nextCritique = await critiqueUiSchema({
        schema: current.schema,
        intent: current.intentSnapshot,
        prompt: current.promptSnapshot || run.prompt,
        revisionId: current.id,
        allowLlm: !useLocal,
      });
      if (useLocal) {
        nextCritique.source = "rules";
        delete nextCritique.model;
      }
      detail = (await attachCritiqueToRevision(
        current.id,
        nextCritique,
        "revised"
      ))!;
    }

    return NextResponse.json({
      ...detail,
      previousRevisionId: parent.id,
      palettePatch: revised.palettePatch || null,
      changelog: revised.changelog || [],
      meta: {
        mode: revised.mode,
        note:
          revised.mode === "local"
            ? `Local revise: ${(revised.changelog || []).join("; ") || "re-scored"}`
            : "Revised via server-side LLM.",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Revise failed" },
      { status: 500 }
    );
  }
}
