import type { GenuiStyle } from "@/config/genui";
import type { DesignIntent, UiSchema } from "@/lib/genui/types";
import { makeId } from "@/lib/genui/ids";

function nid(label: string) {
  return `${label}_${makeId("n").slice(-6)}`;
}

/** Local sample schemas — explicit fixture mode, not claimed as LLM output. */
export function buildFixtureSchema(
  intent: DesignIntent,
  style: GenuiStyle
): UiSchema {
  const title =
    intent.pageType === "dashboard"
      ? "Analytics Overview"
      : intent.pageType === "product-detail"
        ? "Product Detail"
        : "Product Landing";

  if (style === "editorial") {
    return {
      version: 1,
      meta: {
        title,
        pageType: intent.pageType,
        style,
        description: "Editorial fixture layout",
      },
      root: {
        id: nid("page"),
        type: "page",
        props: { theme: style },
        children: [
          {
            id: nid("stack"),
            type: "stack",
            props: { gap: "lg" },
            children: [
              {
                id: nid("badge"),
                type: "badge",
                props: { text: "Essay", tone: "neutral" },
              },
              {
                id: nid("h1"),
                type: "heading",
                props: {
                  text: "Design systems after the model",
                  level: 1,
                },
              },
              {
                id: nid("lead"),
                type: "text",
                props: {
                  text: "A quieter interface for teams who still care about hierarchy, rhythm, and readable type.",
                  muted: true,
                },
              },
              {
                id: nid("img"),
                type: "image",
                props: {
                  alt: "Cover",
                  aspect: "21/9",
                  src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80",
                },
              },
              {
                id: nid("body"),
                type: "text",
                props: {
                  text: "Generative UI should start with intent, not with unconstrained code. This fixture demonstrates an editorial rhythm you can critique and revise.",
                },
              },
              {
                id: nid("cta"),
                type: "button",
                props: { label: "Read the brief", variant: "primary" },
              },
            ],
          },
        ],
      },
    };
  }

  if (style === "minimal") {
    return {
      version: 1,
      meta: {
        title,
        pageType: intent.pageType,
        style,
        description: "Minimal fixture layout",
      },
      root: {
        id: nid("page"),
        type: "page",
        props: { theme: style },
        children: [
          {
            id: nid("stack"),
            type: "stack",
            props: { gap: "lg" },
            children: [
              {
                id: nid("nav"),
                type: "nav",
                props: { items: ["Product", "Pricing", "Docs"] },
              },
              {
                id: nid("h1"),
                type: "heading",
                props: { text: "Ship calmer interfaces", level: 1 },
              },
              {
                id: nid("sub"),
                type: "text",
                props: {
                  text: "Describe a page. Preview it. Improve it with critique — without executing arbitrary model code.",
                  muted: true,
                },
              },
              {
                id: nid("row"),
                type: "row",
                props: { gap: "md" },
                children: [
                  {
                    id: nid("b1"),
                    type: "button",
                    props: { label: "Start generating", variant: "primary" },
                  },
                  {
                    id: nid("b2"),
                    type: "button",
                    props: { label: "View schema", variant: "ghost" },
                  },
                ],
              },
              {
                id: nid("grid"),
                type: "grid",
                props: { columns: 3, gap: "md" },
                children: ["Intent", "Schema", "Preview"].map((t, i) => ({
                  id: nid(`c${i}`),
                  type: "card" as const,
                  children: [
                    {
                      id: nid(`ch${i}`),
                      type: "heading" as const,
                      props: { text: t, level: 3 },
                    },
                    {
                      id: nid(`ct${i}`),
                      type: "text" as const,
                      props: {
                        text: "Structured, reviewable, iterable.",
                        muted: true,
                      },
                    },
                  ],
                })),
              },
            ],
          },
        ],
      },
    };
  }

  // modern-saas / night-sky dashboard fixture
  const dashStyle = style === "night-sky" ? "night-sky" : "modern-saas";
  return {
    version: 1,
    meta: {
      title:
        dashStyle === "night-sky"
          ? "Night Ops Dashboard"
          : intent.pageType === "dashboard"
            ? "SaaS Analytics"
            : title,
      pageType: intent.pageType,
      style: dashStyle,
      description:
        dashStyle === "night-sky"
          ? "Dark geek / night-sky fixture"
          : "Modern SaaS fixture layout",
    },
    root: {
      id: nid("page"),
      type: "page",
      props: { theme: dashStyle },
      children: [
        {
          id: nid("shell"),
          type: "sidebar-layout",
          children: [
            {
              id: nid("side"),
              type: "stack",
              props: { gap: "sm" },
              children: [
                {
                  id: nid("brand"),
                  type: "heading",
                  props: {
                    text: dashStyle === "night-sky" ? "Orion" : "Northstar",
                    level: 3,
                  },
                },
                {
                  id: nid("snav"),
                  type: "nav",
                  props: {
                    items: ["Overview", "Revenue", "Customers", "Settings"],
                  },
                },
              ],
            },
            {
              id: nid("main"),
              type: "stack",
              props: { gap: "md" },
              children: [
                {
                  id: nid("h1"),
                  type: "heading",
                  props: {
                    text:
                      dashStyle === "night-sky"
                        ? "Mission control"
                        : "Revenue overview",
                    level: 1,
                  },
                },
                {
                  id: nid("kpis"),
                  type: "grid",
                  props: { columns: 3, gap: "md" },
                  children: [
                    {
                      id: nid("k1"),
                      type: "kpi-card",
                      props: {
                        title: "Total Revenue",
                        value: "$24,800",
                        delta: "+12.4%",
                      },
                    },
                    {
                      id: nid("k2"),
                      type: "kpi-card",
                      props: {
                        title: "Active Users",
                        value: "3,842",
                        delta: "+4.1%",
                      },
                    },
                    {
                      id: nid("k3"),
                      type: "kpi-card",
                      props: {
                        title: "Churn",
                        value: "1.8%",
                        delta: "-0.3%",
                      },
                    },
                  ],
                },
                {
                  id: nid("chart"),
                  type: "chart",
                  props: {
                    title: "Revenue Overview",
                    chartType: "line",
                    points: [12, 18, 15, 22, 28, 26, 34],
                  },
                },
                {
                  id: nid("table"),
                  type: "table",
                  props: {
                    title: "Recent Transactions",
                    columns: ["Customer", "Plan", "Amount", "Status"],
                    rows: [
                      ["Acme Corp", "Pro", "$190", "Paid"],
                      ["Globex", "Agency", "$490", "Paid"],
                      ["Initech", "Starter", "$0", "Trial"],
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
