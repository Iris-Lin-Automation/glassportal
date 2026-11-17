import { NextRequest, NextResponse } from "next/server";
import { critiqueUiSchema } from "@/lib/genui/critique";
import { listEvalCases } from "@/lib/genui/eval-cases";
import { generateUiSchema } from "@/lib/genui/generator";
import { parseDesignIntent } from "@/lib/genui/intent-parser";
import { reviseUiSchema } from "@/lib/genui/revision";
import {
  appendRevision,
  attachCritiqueToRevision,
  createGeneration,
} from "@/lib/genui/stores/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Run the standard eval suite.
 * Default: fixture mode (honest, deterministic, no fake LLM scores).
 * Optional critique + revise for each case.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      ownerKey?: string;
      /** Use local fixtures (default true for offline demo honesty) */
      fixture?: boolean;
      critique?: boolean;
      revise?: boolean;
      limit?: number;
      caseIds?: string[];
    };

    const ownerKey = (body.ownerKey || "glassportal-eval").trim();
    const useFixture = body.fixture !== false;
    const doCritique = body.critique !== false;
    const doRevise = Boolean(body.revise);
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 40);

    let cases = listEvalCases();
    if (body.caseIds?.length) {
      const set = new Set(body.caseIds);
      cases = cases.filter((c) => set.has(c.id));
    }
    cases = cases.slice(0, limit);

    const results: Array<{
      caseId: string;
      runId: string;
      style: string;
      firstScore: number | null;
      latestScore: number | null;
      delta: number | null;
      issues: number;
      mode: string;
    }> = [];

    for (const c of cases) {
      const { intent } = await parseDesignIntent(c.prompt, {
        style: c.style,
        preferLlm: !useFixture,
      });
      intent.style = c.style;

      const generated = await generateUiSchema({
        prompt: c.prompt,
        intent,
        style: c.style,
        allowFixture: useFixture,
      });

      let detail = await createGeneration({
        ownerKey,
        prompt: c.prompt,
        intent,
        style: c.style,
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

      let firstScore: number | null = null;
      let latestScore: number | null = null;
      let issues = 0;

      if (doCritique && detail.current) {
        const critique = await critiqueUiSchema({
          schema: detail.current.schema,
          intent,
          prompt: c.prompt,
          revisionId: detail.current.id,
          allowLlm: !useFixture,
        });
        if (useFixture) {
          critique.source = "rules";
          delete critique.model;
        }
        detail = (await attachCritiqueToRevision(
          detail.current.id,
          critique,
          "evaluated"
        ))!;
        firstScore = critique.overall;
        latestScore = critique.overall;
        issues = critique.issues.length;

        if (doRevise && detail.current?.critique) {
          const revised = await reviseUiSchema({
            prompt: c.prompt,
            intent,
            style: c.style,
            schema: detail.current.schema,
            critique: detail.current.critique,
            allowLocal: useFixture || true,
          });
          detail = await appendRevision({
            runId: detail.run.id,
            parentRevisionId: detail.current.id,
            schema: revised.schema,
            source: "revise",
            promptSnapshot: c.prompt,
            intentSnapshot: intent,
            rawHash: revised.rawHash,
            usage: revised.usage,
            revisionNotes: revised.notes,
            status: "revised",
          });
          if (detail.current) {
            const after = await critiqueUiSchema({
              schema: detail.current.schema,
              intent,
              prompt: c.prompt,
              revisionId: detail.current.id,
              allowLlm: !useFixture,
            });
            if (useFixture) {
              after.source = "rules";
              delete after.model;
            }
            detail = (await attachCritiqueToRevision(
              detail.current.id,
              after,
              "revised"
            ))!;
            latestScore = after.overall;
            issues = after.issues.length;
          }
        }
      }

      results.push({
        caseId: c.id,
        runId: detail.run.id,
        style: c.style,
        firstScore,
        latestScore,
        delta:
          firstScore != null && latestScore != null
            ? Math.round((latestScore - firstScore) * 10) / 10
            : null,
        issues,
        mode: generated.mode,
      });
    }

    return NextResponse.json({
      ok: true,
      meta: {
        fixture: useFixture,
        critique: doCritique,
        revise: doRevise,
        note: useFixture
          ? "Eval suite ran on local fixtures + rule critique (not fake LLM scores)."
          : "Eval suite attempted live LLM generation where configured.",
      },
      count: results.length,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Eval run failed" },
      { status: 500 }
    );
  }
}
