import { GENUI_RUN_INDEX_LIMIT } from "@/config/genui";
import { readJson, writeJson } from "@/lib/kv-json";
import { makeId } from "@/lib/genui/ids";
import type {
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
