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

  if (style === "night-sky" && intent.pageType === "landing") {
    return {
      version: 1,
      meta: {
        title: "Acme Studio",
        pageType: "landing",
        style: "night-sky",
        description: "Dark product studio landing fixture",
      },
      root: {
        id: nid("page"),
        type: "page",
        props: { theme: "night-sky" },
        children: [
          {
            id: nid("hero"),
            type: "stack",
            props: { gap: "lg" },
            children: [
              {
                id: nid("top"),
                type: "row",
                props: { gap: "md" },
                children: [
                  {
                    id: nid("brand"),
                    type: "heading",
                    props: { text: "Acme Studio", level: 3 },
                  },
                  {
                    id: nid("nav"),
                    type: "nav",
                    props: {
                      items: ["Product", "Pricing", "Docs", "Contact"],
                    },
                  },
                ],
              },
              {
                id: nid("badge"),
                type: "badge",
                props: { text: "Design system", tone: "neutral" },
              },
              {
                id: nid("h1"),
                type: "heading",
                props: {
                  text: "Build digital products faster, together",
                  level: 1,
                },
              },
              {
                id: nid("lead"),
                type: "text",
                props: {
                  text: "Ship polished interfaces with emerald CTAs, violet glow accents, and a critique-ready design loop.",
                  muted: true,
                },
              },
              {
                id: nid("ctas"),
                type: "row",
                props: { gap: "md" },
                children: [
                  {
                    id: nid("b1"),
                    type: "button",
                    props: {
                      label: "Get started for free",
                      variant: "primary",
                    },
                  },
                  {
                    id: nid("b2"),
                    type: "button",
                    props: { label: "Book a demo", variant: "secondary" },
                  },
                ],
              },
              {
                id: nid("img"),
                type: "image",
                props: {
                  alt: "Product dashboard preview",
                  aspect: "16/9",
                  src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80",
                },
              },
              {
                id: nid("features"),
                type: "grid",
                props: { columns: 3, gap: "md" },
                children: [
                  {
                    id: nid("f1"),
                    type: "card",
                    children: [
                      {
                        id: nid("f1h"),
                        type: "heading",
                        props: { text: "Components", level: 3 },
                      },
                      {
                        id: nid("f1t"),
                        type: "text",
                        props: {
                          text: "Buttons, cards, badges, and navs with consistent radius and borders.",
                          muted: true,
                        },
                      },
                    ],
                  },
                  {
                    id: nid("f2"),
                    type: "card",
                    children: [
                      {
                        id: nid("f2h"),
                        type: "heading",
                        props: { text: "Critique", level: 3 },
                      },
                      {
                        id: nid("f2t"),
                        type: "text",
                        props: {
                          text: "Contrast, hierarchy, and spacing scored so revisions stay intentional.",
                          muted: true,
                        },
                      },
                    ],
                  },
                  {
                    id: nid("f3"),
                    type: "card",
                    children: [
                      {
                        id: nid("f3h"),
                        type: "heading",
                        props: { text: "Export", level: 3 },
                      },
                      {
                        id: nid("f3t"),
                        type: "text",
                        props: {
                          text: "Schema-first output you can inspect, revise, and ship.",
                          muted: true,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
  }

  if (style === "obsidian") {
    return {
      version: 1,
      meta: {
        title: "Obsidian Digital",
        pageType: "landing",
        style: "obsidian",
        description: "Cinematic agency landing fixture",
      },
      root: {
        id: nid("page"),
        type: "page",
        props: { theme: "obsidian" },
        children: [
          {
            id: nid("hero"),
            type: "stack",
            props: { gap: "lg" },
            children: [
              {
                id: nid("top"),
                type: "row",
                props: { gap: "md" },
                children: [
                  {
                    id: nid("brand"),
                    type: "heading",
                    props: { text: "OBSIDIAN", level: 3 },
                  },
                  {
                    id: nid("nav"),
                    type: "nav",
                    props: {
                      items: ["About", "Services", "Portfolio", "Contact"],
                    },
                  },
                ],
              },
              {
                id: nid("img"),
                type: "image",
                props: {
                  alt: "Cinematic cover",
                  aspect: "21/9",
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
                },
              },
              {
                id: nid("badge"),
                type: "badge",
                props: { text: "Brand studio", tone: "neutral" },
              },
              {
                id: nid("h1"),
                type: "heading",
                props: {
                  text: "Design that commands absolute attention.",
                  level: 1,
                },
              },
              {
                id: nid("lead"),
                type: "text",
                props: {
                  text: "We craft high-end interactive experiences for brands that refuse to be ignored.",
                  muted: true,
                },
              },
              {
                id: nid("ctas"),
                type: "row",
                props: { gap: "md" },
                children: [
                  {
                    id: nid("b1"),
                    type: "button",
                    props: { label: "View our work →", variant: "primary" },
                  },
                  {
                    id: nid("b2"),
                    type: "button",
                    props: { label: "Book consultation", variant: "ghost" },
                  },
                ],
              },
            ],
          },
        ],
      },
    };
  }

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

  // modern-saas / fintech / night-sky / pulse dashboard fixture
  const dashStyle: GenuiStyle =
    style === "night-sky"
      ? "night-sky"
      : style === "fintech"
        ? "fintech"
        : style === "pulse"
          ? "pulse"
          : "modern-saas";
  const brand =
    dashStyle === "night-sky"
      ? "Acme"
      : dashStyle === "fintech"
        ? "CryptoHub"
        : dashStyle === "pulse"
          ? "PulseMetrics"
          : "Northstar";
  const fourCol = dashStyle === "fintech" || dashStyle === "pulse";
  return {
    version: 1,
    meta: {
      title:
        dashStyle === "night-sky"
          ? "Product Studio"
          : dashStyle === "fintech"
            ? "Portfolio Overview"
            : dashStyle === "pulse"
              ? "Analytics Overview"
              : intent.pageType === "dashboard"
                ? "SaaS Analytics"
                : title,
      pageType: intent.pageType === "landing" ? "dashboard" : intent.pageType,
      style: dashStyle,
      description:
        dashStyle === "fintech"
          ? "Fintech dashboard fixture (incomplete on purpose for Fix demo)"
          : dashStyle === "night-sky"
            ? "Dark product studio fixture (incomplete on purpose for Fix demo)"
            : dashStyle === "pulse"
              ? "PulseMetrics-like dark purple analytics fixture (incomplete for Fix demo)"
              : "Modern SaaS fixture (incomplete on purpose for Fix demo)",
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
                  props: { text: brand, level: 3 },
                },
                {
                  id: nid("snav"),
                  type: "nav",
                  props: {
                    items:
                      dashStyle === "fintech"
                        ? ["Dashboard", "Portfolio", "Trade", "Markets"]
                        : dashStyle === "pulse"
                          ? ["Dashboard", "Users", "Analytics", "Reports"]
                          : ["Overview", "Revenue", "Customers", "Settings"],
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
                  id: nid("header"),
                  type: "row",
                  props: { gap: "md" },
                  children: [
                    {
                      id: nid("h1"),
                      type: "heading",
                      props: {
                        text:
                          dashStyle === "night-sky"
                            ? "Build better products"
                            : dashStyle === "fintech"
                              ? "Welcome back"
                              : dashStyle === "pulse"
                                ? "Dashboard"
                                : "Revenue overview",
                        level: 1,
                      },
                    },
                    ...(dashStyle === "pulse"
                      ? [
                          {
                            id: nid("search"),
                            type: "input" as const,
                            props: {
                              label: "Search",
                              placeholder: "Search users, metrics, reports...",
                            },
                          },
                          {
                            id: nid("cta"),
                            type: "button" as const,
                            props: {
                              label: "Generate Report",
                              variant: "primary",
                            },
                          },
                        ]
                      : []),
                  ],
                },
                {
                  id: nid("kpis"),
                  type: "grid",
                  props: {
                    columns: fourCol ? 4 : 3,
                    gap: "md",
                  },
                  children: (
                    dashStyle === "fintech"
                      ? [
                          {
                            title: "Total Balance",
                            value: "$124,563",
                            delta: "+8.2%",
                          },
                          {
                            title: "24h Volume",
                            value: "$2.4M",
                            delta: "+3.1%",
                          },
                          {
                            title: "Total Profit",
                            value: "$18,420",
                            delta: "+12.4%",
                          },
                          {
                            title: "Active Trades",
                            value: "24",
                            delta: "+2",
                          },
                        ]
                      : dashStyle === "pulse"
                        ? [
                            {
                              title: "Total Active Users",
                              value: "24,891",
                              delta: "+12.4%",
                            },
                            {
                              title: "Total Sessions",
                              value: "182.4k",
                              delta: "+8.1%",
                            },
                            {
                              title: "Avg. Retention",
                              value: "64.2%",
                              delta: "+2.3%",
                            },
                            {
                              title: "Churn Rate",
                              value: "3.8%",
                              delta: "-0.6%",
                            },
                          ]
                        : [
                            {
                              title: "Total Revenue",
                              value: "$24,800",
                              delta: "+12.4%",
                            },
                            {
                              title: "Active Users",
                              value: "3,842",
                              delta: "+4.1%",
                            },
                            {
                              title: "Churn",
                              value: "1.8%",
                              delta: "-0.3%",
                            },
                          ]
                  ).map((k, i) => ({
                    id: nid(`k${i}`),
                    type: "kpi-card" as const,
                    props: k,
                  })),
                },
                {
                  id: nid("chart"),
                  type: "chart",
                  props: {
                    title:
                      dashStyle === "fintech"
                        ? "Portfolio Performance"
                        : dashStyle === "pulse"
                          ? "Weekly Active Users"
                          : "Revenue Overview",
                    chartType: dashStyle === "pulse" ? "line" : "area",
                    points: [12, 18, 15, 22, 28, 26, 34, 38, 36, 44],
                  },
                },
                ...(dashStyle === "pulse"
                  ? [
                      {
                        id: nid("bars"),
                        type: "chart" as const,
                        props: {
                          title: "Feature Adoption",
                          chartType: "bar",
                          points: [22, 18, 28, 16, 24],
                        },
                      },
                    ]
                  : []),
                // Intentionally omit Recent Transactions table so Critique → Fix
                // has a visible improvement (table appears after revise).
              ],
            },
          ],
        },
      ],
    },
  };
}
