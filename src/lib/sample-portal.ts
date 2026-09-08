import type { PortalData } from "@/lib/types";

export const SAMPLE_PORTAL_ID = "sample-acme-gtm-2026";
/** Executive report cover shown in sample live preview + share cards */
export const SAMPLE_COVER_URL = "/sample-executive-cover.png";

export function isSamplePortal(data?: PortalData | null): boolean {
  return Boolean(data && data.id === SAMPLE_PORTAL_ID);
}

/** Acme Corp executive demo — shown before a real Notion page is connected. */
export function createSamplePortalData(): PortalData {
  return {
    id: SAMPLE_PORTAL_ID,
    title: "2026 Q3 B2B Go-To-Market & Revenue Expansion Strategy",
    clientName: "Acme Corporation",
    preparedFor: "Acme Corp Executive Committee",
    badge: "Strictly Confidential",
    status: "active",
    statusLabel: "Proposal Ready",
    brandColor: "#059669",
    coverUrl: SAMPLE_COVER_URL,
    description:
      "Confidential executive briefing — prepared exclusively for the CEO & CFO.",
    updatedAt: new Date().toISOString(),
    stats: [
      {
        label: "TARGET ARR IMPACT",
        value: "$5.2M",
        status: "Board-aligned",
      },
      {
        label: "PAYBACK PERIOD",
        value: "4.2 Months",
        status: "Capital efficient",
      },
      {
        label: "FOCUS CHANNEL",
        value: "Enterprise ABM & Outbound",
        status: "Priority motion",
      },
    ],
    blocks: [
      {
        id: "sample-h2-exec",
        type: "heading",
        content: "Executive Summary",
        metadata: { level: 2 },
      },
      {
        id: "sample-p1",
        type: "paragraph",
        content:
          "Acme Corporation is positioned to unlock $5.2M in incremental ARR through a disciplined Q3 enterprise go-to-market motion. This briefing outlines the recommended ICP, channel mix, capacity model, and 90-day execution plan for the Executive Committee.",
      },
      {
        id: "sample-callout",
        type: "callout",
        content:
          "Key recommendation: concentrate 70% of net-new pipeline capacity on Enterprise ABM + senior outbound, with a parallel product-led expansion track for existing mid-market accounts.",
        metadata: { icon: "💡" },
      },
      {
        id: "sample-h2-market",
        type: "heading",
        content: "Market Context",
        metadata: { level: 2 },
      },
      {
        id: "sample-p2",
        type: "paragraph",
        content:
          "Buying committees have lengthened, but budget authority remains concentrated among CRO / CFO pairs. Competitive intensity is highest in mid-market; enterprise white-space remains under-served relative to Acme’s product depth.",
      },
      {
        id: "sample-h3-icp",
        type: "heading",
        content: "Ideal Customer Profile",
        metadata: { level: 3 },
      },
      {
        id: "sample-list-1",
        type: "list",
        content: "Global / multi-region firms with $200M–$2B revenue",
        metadata: { style: "bulleted" },
      },
      {
        id: "sample-list-2",
        type: "list",
        content: "Existing RevOps stack with CRM hygiene above peer median",
        metadata: { style: "bulleted" },
      },
      {
        id: "sample-list-3",
        type: "list",
        content: "Active mandate to consolidate point solutions in FY26",
        metadata: { style: "bulleted" },
      },
      {
        id: "sample-h2-plan",
        type: "heading",
        content: "90-Day Execution Plan",
        metadata: { level: 2 },
      },
      {
        id: "sample-quote",
        type: "quote",
        content:
          "Treat Q3 as a controlled pilot: instrument every stage, protect senior seller time, and only scale motions that clear payback thresholds.",
      },
      {
        id: "sample-p3",
        type: "paragraph",
        content:
          "Days 1–30 focus on account selection and messaging. Days 31–60 run dual-track ABM + outbound experiments. Days 61–90 convert early pipeline into forecast-quality opportunities and lock FY26 capacity planning.",
      },
      {
        id: "sample-divider",
        type: "divider",
        content: "",
      },
      {
        id: "sample-h2-next",
        type: "heading",
        content: "Decision Required",
        metadata: { level: 2 },
      },
      {
        id: "sample-p4",
        type: "paragraph",
        content:
          "Approve the Q3 capacity model and ABM budget envelope so recruiting and agency briefs can begin this week. A follow-up operating review is scheduled for the second Tuesday of next month.",
      },
    ],
  };
}
