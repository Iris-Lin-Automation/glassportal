/** Internal audit notes written back to Notion — never show in client portal. */
export function isInternalSyncCallout(content: string): boolean {
  const t = content.trim().toLowerCase();
  return (
    t.startsWith("glassportal sync") ||
    t.includes("glassportal sync ·") ||
    t.includes("client confirmed / signed proposal") ||
    t.includes("client withdrew confirmation")
  );
}
