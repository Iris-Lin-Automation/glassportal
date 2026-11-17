import type { GenuiStyle } from "@/config/genui";

export type EvalCase = {
  id: string;
  prompt: string;
  style: GenuiStyle;
  tags: string[];
  /** Components we expect the intent / schema path to cover */
  expectedComponents: string[];
  scenario: string;
};

/** ≥20 standard exam prompts for Phase 4 eval / demo. */
export const GENUI_EVAL_CASES: EvalCase[] = [
  {
    id: "saas-dashboard-night",
    prompt:
      "Create a dark geek night-sky analytics dashboard with a sidebar, KPI cards, revenue chart and recent transactions.",
    style: "night-sky",
    tags: ["dashboard", "saas", "dark"],
    expectedComponents: ["sidebar-layout", "kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "saas-dashboard-modern",
    prompt:
      "Build a modern SaaS analytics admin with sidebar navigation, KPI row, line chart, and a customers table.",
    style: "modern-saas",
    tags: ["dashboard", "saas"],
    expectedComponents: ["sidebar-layout", "kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "minimal-landing",
    prompt:
      "Design a minimal product landing page with a clear H1, short supporting text, and a primary CTA button.",
    style: "minimal",
    tags: ["landing", "minimal"],
    expectedComponents: ["heading", "text", "button"],
    scenario: "极简产品落地页",
  },
  {
    id: "minimal-pricing-teaser",
    prompt:
      "Minimal pricing teaser: headline, three plan cards with price and a subscribe button on each.",
    style: "minimal",
    tags: ["landing", "pricing", "minimal"],
    expectedComponents: ["heading", "card", "button"],
    scenario: "极简产品落地页",
  },
  {
    id: "editorial-essay",
    prompt:
      "Editorial magazine essay page with large title, lead paragraph, cover image, and body copy.",
    style: "editorial",
    tags: ["editorial", "content"],
    expectedComponents: ["heading", "text", "image"],
    scenario: "Editorial 内容站",
  },
  {
    id: "editorial-story",
    prompt:
      "Editorial story layout: serif-feeling headline, muted dek, hero image, and a reading CTA.",
    style: "editorial",
    tags: ["editorial"],
    expectedComponents: ["heading", "text", "image", "button"],
    scenario: "Editorial 内容站",
  },
  {
    id: "ecommerce-detail",
    prompt:
      "Ecommerce product detail page with product image, title, price text, size options as badges, and add-to-cart button.",
    style: "modern-saas",
    tags: ["ecommerce", "product"],
    expectedComponents: ["image", "heading", "text", "badge", "button"],
    scenario: "电商商品详情",
  },
  {
    id: "ecommerce-gallery",
    prompt:
      "Product detail with gallery image, name, short description, KPI-style stock metric, and buy button.",
    style: "minimal",
    tags: ["ecommerce"],
    expectedComponents: ["image", "heading", "text", "button"],
    scenario: "电商商品详情",
  },
  {
    id: "mobile-admin",
    prompt:
      "Mobile-first ops dashboard: stacked KPI cards, a small chart, and a compact activity table for phone screens.",
    style: "modern-saas",
    tags: ["mobile", "dashboard"],
    expectedComponents: ["kpi-card", "chart", "table"],
    scenario: "移动端管理页",
  },
  {
    id: "mobile-settings",
    prompt:
      "Mobile settings page with section headings, form inputs for name and email, and a save button.",
    style: "minimal",
    tags: ["mobile", "settings", "form"],
    expectedComponents: ["heading", "input", "button"],
    scenario: "移动端管理页",
  },
  {
    id: "night-mission-control",
    prompt:
      "Night sky mission control board with sidebar, neon KPIs, signal chart, and alert transactions table.",
    style: "night-sky",
    tags: ["dashboard", "dark"],
    expectedComponents: ["sidebar-layout", "kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "saas-onboarding",
    prompt:
      "Modern SaaS onboarding form: welcome heading, name and company inputs, and continue button.",
    style: "modern-saas",
    tags: ["form", "saas"],
    expectedComponents: ["heading", "input", "button"],
    scenario: "极简产品落地页",
  },
  {
    id: "saas-billing",
    prompt:
      "Billing overview dashboard: KPI cards for MRR and churn, revenue chart, and invoices table.",
    style: "modern-saas",
    tags: ["dashboard", "billing"],
    expectedComponents: ["kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "editorial-newsletter",
    prompt:
      "Editorial newsletter landing with bold title, short pitch text, email input, and subscribe button.",
    style: "editorial",
    tags: ["editorial", "form"],
    expectedComponents: ["heading", "text", "input", "button"],
    scenario: "Editorial 内容站",
  },
  {
    id: "minimal-docs-home",
    prompt:
      "Minimal docs homepage: product name heading, one-sentence description, nav links, and get started button.",
    style: "minimal",
    tags: ["docs", "minimal"],
    expectedComponents: ["heading", "text", "nav", "button"],
    scenario: "极简产品落地页",
  },
  {
    id: "ecommerce-cart-summary",
    prompt:
      "Checkout summary card: order title, line-item list, total text, and pay now button.",
    style: "modern-saas",
    tags: ["ecommerce", "checkout"],
    expectedComponents: ["heading", "list", "text", "button"],
    scenario: "电商商品详情",
  },
  {
    id: "night-security",
    prompt:
      "Dark security ops panel with sidebar, threat KPI cards, incident chart, and recent alerts table.",
    style: "night-sky",
    tags: ["dashboard", "security", "dark"],
    expectedComponents: ["sidebar-layout", "kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "saas-team-directory",
    prompt:
      "Team directory page with heading, search input, and a members table with role and status columns.",
    style: "modern-saas",
    tags: ["saas", "table"],
    expectedComponents: ["heading", "input", "table"],
    scenario: "SaaS 数据后台",
  },
  {
    id: "minimal-empty-state",
    prompt:
      "Minimal empty state: heading, muted helper text, and primary create-new button.",
    style: "minimal",
    tags: ["empty-state", "minimal"],
    expectedComponents: ["heading", "text", "button"],
    scenario: "极简产品落地页",
  },
  {
    id: "editorial-feature",
    prompt:
      "Editorial feature article: oversized H1, byline text, wide image, and two body paragraphs.",
    style: "editorial",
    tags: ["editorial", "article"],
    expectedComponents: ["heading", "text", "image"],
    scenario: "Editorial 内容站",
  },
  {
    id: "mobile-inbox",
    prompt:
      "Mobile inbox UI: title, filter badges, message list items, and compose button.",
    style: "modern-saas",
    tags: ["mobile", "inbox"],
    expectedComponents: ["heading", "badge", "list", "button"],
    scenario: "移动端管理页",
  },
  {
    id: "saas-usage-report",
    prompt:
      "Usage report page with KPI cards for API calls, bar chart of weekly usage, and top endpoints table.",
    style: "modern-saas",
    tags: ["dashboard", "report"],
    expectedComponents: ["kpi-card", "chart", "table"],
    scenario: "SaaS 数据后台",
  },
];

export function listEvalCases() {
  return GENUI_EVAL_CASES;
}

export function getEvalCase(id: string) {
  return GENUI_EVAL_CASES.find((c) => c.id === id) || null;
}
