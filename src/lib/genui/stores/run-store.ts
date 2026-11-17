import { GENUI_RUN_INDEX_LIMIT } from "@/config/genui";
import { readJson, writeJson } from "@/lib/kv-json";
import { makeId } from "@/lib/genui/ids";
import type {
  CritiqueResult,
  DesignIntent,
  GenerationRun,
  GenerationStatus,
  RevisionRecord,
  RunDetail,
  UiSchema,
} from "@/lib/genui/types";

function runKey(id: string) {
  return `genui:run:${id}`;
}
function revKey(id: string) {
  return `genui:rev:${id}`;
}
function indexKey(ownerKey: string) {
  return `genui:index:runs:${ownerKey}`;
}

export async function saveRun(run: GenerationRun) {
  await writeJson(runKey(run.id), run);
  const idx =
    (await readJson<string[]>(indexKey(run.ownerKey))) || [];
  const next = [run.id, ...idx.filter((id) => id !== run.id)].slice(
    0,
    GENUI_RUN_INDEX_LIMIT
  );
  await writeJson(indexKey(run.ownerKey), next);
  // Global recent index for dashboard later
  const global = (await readJson<string[]>("genui:index:runs:global")) || [];
  await writeJson(
    "genui:index:runs:global",
    [run.id, ...global.filter((id) => id !== run.id)].slice(0, GENUI_RUN_INDEX_LIMIT)
  );
  return run;
}

export async function saveRevision(rev: RevisionRecord) {
  await writeJson(revKey(rev.id), rev);
  return rev;
}

export async function loadRun(id: string) {
  return readJson<GenerationRun>(runKey(id));
}

export async function loadRevision(id: string) {
  return readJson<RevisionRecord>(revKey(id));
}

export async function loadRunDetail(id: string): Promise<RunDetail | null> {
  const run = await loadRun(id);
  if (!run) return null;
  const revisions: RevisionRecord[] = [];
  for (const rid of run.revisionIds) {
    const rev = await loadRevision(rid);
    if (rev) revisions.push(rev);
  }
  const current =
    revisions.find((r) => r.id === run.currentRevisionId) ||
    revisions[0] ||
    null;
  return { run, revisions, current };
}

export async function listRuns(ownerKey: string, limit = 30) {
  const key = ownerKey === "*" ? "genui:index:runs:global" : indexKey(ownerKey);
  const ids = (await readJson<string[]>(key)) || [];
  const runs: GenerationRun[] = [];
  for (const id of ids.slice(0, limit)) {
    const run = await loadRun(id);
    if (run) runs.push(run);
  }
  return runs;
}

export async function createGeneration(opts: {
  ownerKey: string;
  prompt: string;
  intent: DesignIntent;
  style: GenerationRun["style"];
  model: GenerationRun["model"];
  schema: UiSchema;
  source: RevisionRecord["source"];
  rawHash?: string;
  usage?: RevisionRecord["tokenUsage"];
  status?: GenerationStatus;
}): Promise<RunDetail> {
  const runId = makeId("run");
  const revId = makeId("rev");
  const now = new Date().toISOString();

  const revision: RevisionRecord = {
    id: revId,
    runId,
    createdAt: now,
    source: opts.source,
    promptSnapshot: opts.prompt,
    intentSnapshot: opts.intent,
    schema: opts.schema,
    rawModelOutputHash: opts.rawHash,
    tokenUsage: opts.usage,
  };

  const run: GenerationRun = {
    id: runId,
    createdAt: now,
    updatedAt: now,
    ownerKey: opts.ownerKey,
    prompt: opts.prompt,
    intent: opts.intent,
    style: opts.style,
    model: opts.model,
    status: opts.status || "generated",
    currentRevisionId: revId,
    revisionIds: [revId],
  };

  await saveRevision(revision);
  await saveRun(run);
  return { run, revisions: [revision], current: revision };
}

export async function attachCritiqueToRevision(
  revisionId: string,
  critique: CritiqueResult,
  runStatus: GenerationStatus = "evaluated"
) {
  const rev = await loadRevision(revisionId);
  if (!rev) throw new Error("Revision not found");
  const next: RevisionRecord = { ...rev, critique };
  await saveRevision(next);
  const run = await loadRun(rev.runId);
  if (run) {
    run.status = runStatus;
    run.updatedAt = new Date().toISOString();
    await saveRun(run);
  }
  return loadRunDetail(rev.runId);
}

export async function appendRevision(opts: {
  runId: string;
  parentRevisionId: string;
  schema: UiSchema;
  source: RevisionRecord["source"];
  promptSnapshot: string;
  intentSnapshot: DesignIntent;
  rawHash?: string;
  usage?: RevisionRecord["tokenUsage"];
  revisionNotes?: string;
  critique?: CritiqueResult;
  status?: GenerationStatus;
}): Promise<RunDetail> {
  const run = await loadRun(opts.runId);
  if (!run) throw new Error("Run not found");

  const revId = makeId("rev");
  const now = new Date().toISOString();
  const revision: RevisionRecord = {
    id: revId,
    runId: opts.runId,
    parentRevisionId: opts.parentRevisionId,
    createdAt: now,
    source: opts.source,
    promptSnapshot: opts.promptSnapshot,
    intentSnapshot: opts.intentSnapshot,
    schema: opts.schema,
    rawModelOutputHash: opts.rawHash,
    tokenUsage: opts.usage,
    revisionNotes: opts.revisionNotes,
    critique: opts.critique,
  };

  run.revisionIds = [...run.revisionIds, revId];
  run.currentRevisionId = revId;
  run.updatedAt = now;
  run.status = opts.status || "revised";

  await saveRevision(revision);
  await saveRun(run);
  const detail = await loadRunDetail(run.id);
  if (!detail) throw new Error("Failed to reload run");
  return detail;
}
