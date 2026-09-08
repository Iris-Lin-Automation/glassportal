export type HeartbeatEventType =
  | "page_view"
  | "heartbeat"
  | "section_view"
  | "progress"
  | "confirm"
  | "export"
  | "copy_link";

export interface HeartbeatEvent {
  type: HeartbeatEventType;
  pageId: string;
  sessionId: string;
  sectionId?: string;
  sectionTitle?: string;
  progress?: number;
  ts: number;
  meta?: Record<string, unknown>;
}

/** In-memory ring buffer for MVP analytics (resets on server restart). */
const MAX = 500;
const events: HeartbeatEvent[] = [];

export function pushHeartbeat(event: HeartbeatEvent) {
  events.push(event);
  if (events.length > MAX) events.splice(0, events.length - MAX);
}

export function listHeartbeats(pageId?: string, limit = 50): HeartbeatEvent[] {
  const filtered = pageId
    ? events.filter((e) => e.pageId === pageId)
    : events;
  return filtered.slice(-limit).reverse();
}

export function latestProgress(pageId: string): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.pageId === pageId && typeof e.progress === "number") {
      return e.progress;
    }
  }
  return 0;
}
