export type ParsedBlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "list"
  | "toggle"
  | "code"
  | "table"
  | "table_row"
  | "divider"
  | "quote"
  | "image"
  | "bookmark"
  | "embed"
  | "card_grid"
  | "unsupported";

export interface NotionParsedBlock {
  id: string;
  type: ParsedBlockType;
  content: string;
  /** Image / file URL when applicable */
  url?: string;
  /** For table rows: cell plain-text values */
  cells?: string[];
  metadata?: Record<string, unknown>;
  children?: NotionParsedBlock[];
}

export interface PortalStat {
  label: string;
  value: string;
  icon?: string;
  /** Optional footer status line under the metric */
  status?: string;
}

export interface PortalData {
  id: string;
  title: string;
  icon?: string;
  coverUrl?: string;
  badge?: string;
  clientName?: string;
  preparedFor?: string;
  description?: string;
  status?: "active" | "encrypted" | "draft";
  statusLabel?: string;
  password?: string;
  /** Accent derived from client logo (e.g. #1B4D3E) */
  brandColor?: string;
  updatedAt: string;
  stats?: PortalStat[];
  blocks: NotionParsedBlock[];
}

export type PortalTheme =
  | "mckinsey-slate"
  | "bcg-emerald"
  | "stripe-midnight"
  // legacy ids — normalized in config/themes.ts
  | "slate-gray"
  | "royal-navy"
  | "executive-light"
  | "crisp-minimal"
  | "dark-glass"
  | "neon-midnight";
