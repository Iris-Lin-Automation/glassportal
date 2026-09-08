/**
 * Generates docs/GlassPortal-Pro-Quickstart.pdf for Gumroad delivery.
 * Run: npx tsx scripts/generate-quickstart-pdf.ts
 */
import { jsPDF } from "jspdf";
import { promises as fs } from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "docs", "GlassPortal-Pro-Quickstart.pdf");

function addFooter(pdf: jsPDF, page: number, total: number) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("GlassPortal Pro · Confidential client delivery", 16, h - 10);
  pdf.text(`${page} / ${total}`, w - 16, h - 10, { align: "right" });
}

async function main() {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = 22;

  const ensureSpace = (need: number) => {
    if (y + need > 275) {
      pdf.addPage();
      y = 22;
    }
  };

  const h1 = (t: string) => {
    ensureSpace(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42);
    pdf.text(t, margin, y);
    y += 10;
  };

  const h2 = (t: string) => {
    ensureSpace(12);
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(t, margin, y);
    y += 7;
  };

  const body = (t: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    const lines = pdf.splitTextToSize(t, maxW);
    ensureSpace(lines.length * 5 + 4);
    pdf.text(lines, margin, y);
    y += lines.length * 5 + 3;
  };

  const bullet = (items: string[]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    for (const item of items) {
      const lines = pdf.splitTextToSize(`•  ${item}`, maxW);
      ensureSpace(lines.length * 5 + 2);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 1.5;
    }
    y += 2;
  };

  const linkLine = (label: string, url: string) => {
    ensureSpace(8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(label, margin, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(37, 99, 235);
    pdf.text(url, margin, y);
    y += 7;
    pdf.setTextColor(51, 65, 85);
  };

  // --- Page content ---
  h1("GlassPortal Pro");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Quickstart Guide · Executive client delivery from Notion", margin, y);
  y += 8;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);
  y += 10;

  body(
    "Thank you for purchasing GlassPortal Pro. This guide gets you from zero to a client-ready portal in minutes."
  );

  h2("1. Your access");
  linkLine("App URL", "https://glassportal.vercel.app");
  body(
    "Open the app, click Sign in, and register with the SAME email you used on Gumroad. After payment, open https://glassportal.vercel.app/thanks and check your plan — Pro should unlock automatically within a minute. If it is still Free, click Refresh plan in Studio, or reply to your receipt email."
  );

  h2("2. What Pro unlocks");
  bullet([
    "Remove the GlassPortal mark from live portals and PDF exports",
    "White-label header for client-facing delivery",
    "Passcode protection and private client links",
    "Up to 3 published portals on the Pro plan",
  ]);

  h2("3. Connect Notion (5 minutes)");
  bullet([
    "In Notion: Settings → Connections → Develop or manage integrations → New integration",
    "Copy the Internal Integration Secret (starts with secret_ or ntn_)",
    "Open your report page in Notion → ••• → Connect to → select your integration",
    "In GlassPortal Studio: paste the Integration Token and the Page URL, then wait for Live Preview",
  ]);
  body(
    "Tip: before connecting, click Load Sample Report to explore themes, branding, and PDF export with demo content."
  );

  h2("4. Brand and secure");
  bullet([
    "Upload the client logo (PNG/JPG/SVG) — used in header, favicon, and share cards",
    "Set Client Name and Executive Theme (McKinsey Slate / BCG Emerald / Stripe Midnight)",
    "Enable Simple Passcode for confidential links, or use a Private client link that opens without a passcode",
    "Customize the VIP Share Card title and confidentiality badge for WeChat / Slack / Email / WhatsApp",
  ]);

  h2("5. Publish and share");
  bullet([
    "Sign in, then click Save & Publish Portal",
    "Copy the Passcode link or Private client link",
    "Send the link to your client — they never create an account",
    "Clients can read, confirm/sign, and export PDF from the portal",
  ]);

  h2("6. Notion setup checklist");
  bullet([
    "Integration created and secret copied",
    "Target page (and any sub-pages you need) shared with the integration",
    "Page title is board-ready (it becomes the portal H1)",
    "Optional: Status / Password properties if you use Notion fields for gating",
    "Token stored only in your browser — never email secrets to clients",
  ]);

  h2("7. Support");
  body(
    "Reply to your Gumroad receipt email with: (1) purchase email, (2) Studio sign-in email, (3) short description of the issue. We typically respond within one business day."
  );

  y += 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  ensureSpace(16);
  pdf.text("Deliver executive portals. Not Notion screenshots.", margin, y);

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, total);
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const buf = Buffer.from(pdf.output("arraybuffer"));
  await fs.writeFile(OUT, buf);
  // Also copy to public for easy download from the live site
  const publicOut = path.join(process.cwd(), "public", "GlassPortal-Pro-Quickstart.pdf");
  await fs.writeFile(publicOut, buf);
  console.log("Wrote", OUT);
  console.log("Wrote", publicOut);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
