"use client";

import type { NotionParsedBlock, PortalData, PortalTheme } from "@/lib/types";
import { getThemePreset, type ThemePreset } from "@/lib/theme-presets";
import { isInternalSyncCallout } from "@/lib/sync-markers";
import { CalloutGlass } from "@/components/ui/CalloutGlass";
import { PortalHeader } from "@/components/ui/PortalHeader";
import { PoweredByWatermark } from "@/components/portal/PoweredByWatermark";
import { NotionImage } from "@/components/portal/NotionImage";
import { ResourceCard } from "@/components/portal/ResourceCard";

function groupBlocks(blocks: NotionParsedBlock[]): Array<
  | { kind: "list_group"; style: string; items: NotionParsedBlock[] }
  | { kind: "block"; block: NotionParsedBlock }
> {
  const groups: Array<
    | { kind: "list_group"; style: string; items: NotionParsedBlock[] }
    | { kind: "block"; block: NotionParsedBlock }
  > = [];

  for (const block of blocks) {
    if (block.type === "list") {
      const style = String(block.metadata?.style || "bulleted");
      const last = groups[groups.length - 1];
      if (last?.kind === "list_group" && last.style === style) {
        last.items.push(block);
      } else {
        groups.push({ kind: "list_group", style, items: [block] });
      }
      continue;
    }
    groups.push({ kind: "block", block });
  }

  return groups;
}

function ListGroup({
  style,
  items,
  preset,
}: {
  style: string;
  items: NotionParsedBlock[];
  preset: ThemePreset;
}) {
  if (style === "todo") {
    return (
      <ul className="my-5 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border ${
                item.metadata?.checked
                  ? "border-slate-900 bg-slate-900"
                  : "border-slate-300 bg-white"
              }`}
            />
            <span className={preset.bodyText}>{item.content}</span>
          </li>
        ))}
      </ul>
    );
  }

  const ListTag = style === "numbered" ? "ol" : "ul";
  return (
    <ListTag
      className={
        style === "numbered"
          ? `my-5 list-decimal space-y-2 pl-5 ${preset.bodyText} ${preset.listMarker} marker:font-medium`
          : `my-5 list-disc space-y-2 pl-5 ${preset.bodyText} ${preset.listMarker}`
      }
    >
      {items.map((item) => (
        <li key={item.id} className="pl-1">
          {item.content}
        </li>
      ))}
    </ListTag>
  );
}

/** Clean comparison table — theme-aware; horizontal slider preserved. */
function NotionTable({
  block,
  preset,
}: {
  block: NotionParsedBlock;
  preset: ThemePreset;
}) {
  const rows = (block.children || []).filter((r) => r.type === "table_row");
  const hasHeader = Boolean(block.metadata?.has_column_header);
  if (!rows.length) {
    return (
      <p className={`my-4 text-sm ${preset.mutedText}`}>Empty table</p>
    );
  }

  const header = hasHeader ? rows[0] : null;
  const body = hasHeader ? rows.slice(1) : rows;
  const colCount = Math.max(
    ...(rows.map((r) => (r.cells || [r.content]).length) || [1]),
    1
  );

  return (
    <div
      className={`my-8 w-full max-w-full overflow-hidden rounded-xl border ${preset.tableWrap}`}
    >
      <p
        className={`border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium sm:hidden ${preset.mutedText}`}
      >
        Swipe sideways to view full table
      </p>
      {/* Horizontal scroll MUST stay — wide Notion tables need a bottom scrollbar */}
      <div className="portal-table-scroll w-full max-w-full overscroll-x-contain pb-1">
        <table
          className="w-max min-w-full border-collapse text-left"
          style={{ minWidth: `${Math.max(colCount, 4) * 180}px` }}
        >
          {header ? (
            <thead>
              <tr>
                {(header.cells || [header.content]).map((cell, i) => (
                  <th
                    key={`${header.id}-${i}`}
                    className={`whitespace-nowrap px-4 py-3 ${preset.tableHead}`}
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {body.map((row) => (
              <tr
                key={row.id}
                className={`transition-colors last:border-b-0 ${preset.tableRow}`}
              >
                {(row.cells || [row.content]).map((cell, i) => (
                  <td
                    key={`${row.id}-${i}`}
                    className={`whitespace-nowrap px-4 py-3 align-top last:border-r-0 ${preset.tableRule} ${preset.tableCell}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlockView({
  block,
  token,
  rev,
  preset,
}: {
  block: NotionParsedBlock;
  token?: string;
  rev?: string;
  preset: ThemePreset;
}) {
  switch (block.type) {
    case "heading": {
      const level = Number(block.metadata?.level || 2);
      if (level === 1) {
        return (
          <h2
            className={`mb-5 mt-12 text-2xl font-bold tracking-tight ${preset.headingText}`}
          >
            {block.content}
          </h2>
        );
      }
      return (
        <h3
          className={`mb-4 mt-10 text-lg font-semibold ${preset.headingText}`}
        >
          {block.content}
        </h3>
      );
    }
    case "paragraph":
      return (
        <p className={`mb-5 mt-0 bg-transparent ${preset.bodyText}`}>
          {block.content}
        </p>
      );
    case "callout":
      if (isInternalSyncCallout(block.content)) return null;
      return (
        <div className="my-6">
          <CalloutGlass content={block.content} className={preset.callout} />
        </div>
      );
    case "toggle":
      return (
        <details className="group my-5">
          <summary
            className={`cursor-pointer list-none text-[15px] font-medium tracking-tight marker:content-none [&::-webkit-details-marker]:hidden ${preset.headingText}`}
          >
            <span
              className={`mr-2 inline-block transition group-open:rotate-90 ${preset.mutedText}`}
            >
              ›
            </span>
            {block.content}
          </summary>
          <div className="mt-3 space-y-1 border-l border-slate-200/80 pl-4">
            {groupBlocks(block.children || []).map((g, idx) =>
              g.kind === "list_group" ? (
                <ListGroup
                  key={`${block.id}-tg-${idx}`}
                  style={g.style}
                  items={g.items}
                  preset={preset}
                />
              ) : (
                <BlockView
                  key={g.block.id}
                  block={g.block}
                  token={token}
                  rev={rev}
                  preset={preset}
                />
              )
            )}
          </div>
        </details>
      );
    case "quote":
      return (
        <blockquote className={`my-6 ${preset.quote}`}>
          <p className="text-[15px] font-medium leading-relaxed text-slate-900">
            {block.content}
          </p>
        </blockquote>
      );
    case "code":
      return (
        <pre
          className={`my-5 overflow-x-auto rounded-xl border px-4 py-3 text-sm leading-relaxed ${preset.code}`}
        >
          <code>{block.content}</code>
        </pre>
      );
    case "divider":
      return <hr className="my-10 border-0 border-t border-slate-200/80" />;
    case "image": {
      const caption =
        (typeof block.metadata?.caption === "string" &&
          block.metadata.caption) ||
        (block.content !== "Image" ? block.content : "");
      return (
        <NotionImage
          blockId={block.id}
          url={block.url}
          caption={caption || undefined}
          token={token}
          rev={rev}
        />
      );
    }
    case "bookmark":
    case "embed":
      return (
        <ResourceCard
          url={block.url || ""}
          title={
            typeof block.metadata?.title === "string"
              ? block.metadata.title
              : undefined
          }
          caption={
            typeof block.metadata?.caption === "string"
              ? block.metadata.caption
              : block.content
          }
          kind={
            block.type === "embed"
              ? "embed"
              : String(block.metadata?.source || "") === "link_preview"
                ? "link_preview"
                : "bookmark"
          }
        />
      );
    case "card_grid":
      return (
        <div className="my-5 rounded-r-lg border-l-4 border-current bg-slate-50 p-4 text-slate-600">
          <p className="text-[15px] text-slate-800">
            Linked page:{" "}
            <span className={`font-medium ${preset.headingText}`}>
              {block.content}
            </span>
          </p>
        </div>
      );
    case "table":
      return <NotionTable block={block} preset={preset} />;
    default:
      return null;
  }
}

export function PortalRenderer({
  data,
  token,
  logoUrl,
  theme,
  whiteLabel = false,
  showWatermark = false,
}: {
  data: PortalData;
  token?: string;
  /** Dynamic brand logo — always forwarded to PortalHeader (never hardcode). */
  logoUrl?: string;
  theme?: PortalTheme;
  whiteLabel?: boolean;
  /** Starter PLG footer inside export root (PDF + live view). */
  showWatermark?: boolean;
}) {
  const grouped = groupBlocks(data.blocks);
  const rev = data.updatedAt || String(data.blocks.length);
  const resolvedLogo =
    logoUrl ||
    (data.icon &&
    (data.icon.startsWith("http") ||
      data.icon.startsWith("data:") ||
      data.icon.startsWith("/"))
      ? data.icon
      : undefined);
  const preset = getThemePreset(theme);
  const pageTitle = (data.title || "").trim().toLowerCase();

  // Skip the first body H1 when it duplicates the Notion page title (already in header)
  const contentGroups = (() => {
    if (!pageTitle || grouped.length === 0) return grouped;
    const first = grouped[0];
    if (
      first.kind === "block" &&
      first.block.type === "heading" &&
      Number(first.block.metadata?.level || 2) === 1 &&
      first.block.content.trim().toLowerCase() === pageTitle
    ) {
      return grouped.slice(1);
    }
    return grouped;
  })();

  return (
    <div
      id="portal-export-root"
      className={`mx-auto w-full max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-24 md:px-8 ${preset.pageText}`}
    >
      <PortalHeader
        data={data}
        logoUrl={resolvedLogo}
        theme={theme}
        whiteLabel={whiteLabel}
      />

      <div className={`my-8 h-px w-full ${preset.divider}`} />

      <article className="w-full max-w-full space-y-1 break-words [&_img]:h-auto [&_img]:max-w-full [&_img]:object-contain [&_pre]:max-w-full [&_pre]:overflow-x-auto">
        {contentGroups.map((g, idx) =>
          g.kind === "list_group" ? (
            <ListGroup
              key={`list-${idx}-${g.items[0]?.id}`}
              style={g.style}
              items={g.items}
              preset={preset}
            />
          ) : (
            <BlockView
              key={g.block.id}
              block={g.block}
              token={token}
              rev={rev}
              preset={preset}
            />
          )
        )}
      </article>

      <PoweredByWatermark show={showWatermark && !whiteLabel} inline />
    </div>
  );
}
