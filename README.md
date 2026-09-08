# GlassPortal

**Notion-powered B2B client delivery & proposal portal engine.**

Turn any Notion page into a polished, password-protected, dark-glassmorphism client portal — complete with custom branding, live sync, analytics, and one-click PDF export. Built for consultants and agencies who deliver executive proposals, strategy briefs, and client reports.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38bdf8?logo=tailwindcss&logoColor=white)
![Notion API](https://img.shields.io/badge/Notion%20API-integrated-000000?logo=notion&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel&logoColor=white)

---

## Overview

GlassPortal is a full-stack SaaS-style application that sits on top of the Notion API. Authors connect a Notion page once, and the app renders it as a branded, client-ready portal at a shareable `/p/[id]` URL. A built-in Studio provides a WYSIWYG-style builder for configuring branding, plan tier, passcodes, and custom domains.

### Live demo

- **Sample portal** — `/p/demo` (no Notion connection required)
- **Builder / Studio** — `/`

---

## Features

- **Notion as CMS** — Parse Notion blocks (headings, paragraphs, lists, quotes, callouts, dividers, images) into a structured, responsive portal.
- **Apple-grade dark glassmorphism** — Custom `GlassCard`, `CalloutGlass`, and `PortalHeader` components with a layered, translucent design system.
- **Custom branding** — Upload a logo, auto-extract the brand color, and generate a matching favicon.
- **Live sync** — Keep portals in sync with the source Notion page via a `/sync` endpoint and durable sync markers.
- **Access control** — Passcode protection (`PasswordGate`) and auth-modal flows for gated content.
- **Plan tiers & monetization** — Starter / Pro / Agency plans with watermarking, white-labeling, and custom-domain support.
- **Checkout & webhooks** — Gumroad and Lemon Squeezy webhook handlers with plan fulfillment.
- **Analytics** — Heartbeat pings and a client-side analytics store for portal engagement tracking.
- **PDF export** — Client-side export of any portal to a shareable PDF (`html-to-image` + `jsPDF`).
- **Durable storage** — Upstash Redis / Vercel KV for plans and branding (survives serverless cold starts).

---

## Tech stack

| Layer        | Technology                                                          |
| ------------ | ------------------------------------------------------------------- |
| Framework    | Next.js 14 (App Router)                                             |
| Language     | TypeScript                                                          |
| Styling      | Tailwind CSS 3, custom glass tokens                                 |
| Data source  | Notion API (`@notionhq/client`)                                     |
| Storage      | Upstash Redis / Vercel KV                                           |
| Export       | `html-to-image`, `jsPDF`                                            |
| Animations   | `framer-motion`                                                     |
| Payments     | Gumroad + Lemon Squeezy webhooks                                    |
| Hosting      | Vercel                                                              |

---

## Architecture

```
Notion page ──▶ Notion API ──▶ parser.ts ──▶ PortalData (typed schema)
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
              /p/[id] (public)          / (Studio builder)       /api/* (routes)
              PortalRenderer            branding / themes         portal · sync · plan
                                                                  webhooks · heartbeat
                                              │
                                              ▼
                                      Upstash Redis / Vercel KV
```

- **`src/lib/parser.ts`** converts raw Notion blocks into a normalized `PortalData` shape.
- **`src/components/portal/`** renders that shape with the glass design system.
- **`src/app/api/`** exposes serverless routes for portal reads, Notion sync, plan fulfillment, and payment webhooks.
- **`middleware.ts`** handles portal-level routing and access gates.

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Notion Integration](https://developers.notion.com/) token

### Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a `.env.local` file from `.env.example` and fill in the variables you need. For local MVP testing, the Notion token can also be passed as a query parameter from the builder.

---

## Environment variables

| Variable                            | Required | Description                                        |
| ----------------------------------- | -------- | -------------------------------------------------- |
| `NOTION_API_TOKEN`                  | Optional | Server-side fallback Notion token                  |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional | Upstash Redis / Vercel KV for durable storage  |
| `NEXT_PUBLIC_APP_HOST`              | Optional | Public app host (e.g. `glassportal.vercel.app`)    |
| `NEXT_PUBLIC_PORTAL_DOMAIN`         | Optional | Public portal domain                               |
| `NEXT_PUBLIC_GUMROAD_CHECKOUT_*`    | Optional | Gumroad checkout links                             |
| `NEXT_PUBLIC_LEMON_CHECKOUT_*`      | Optional | Lemon Squeezy checkout links                       |
| `GUMROAD_WEBHOOK_SECRET`            | Optional | Webhook verification secret                        |
| `FULFILLMENT_SECRET`                | Optional | Secret for manual plan fulfillment                 |

> See [`.env.example`](.env.example) for the full annotated list.

---

## Deployment

Deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

```bash
npm run build
npm run start
```

Set the required environment variables in the Vercel dashboard and add your Notion integration token.

---

## Project structure

```
src/
├── app/
│   ├── api/                # Serverless API routes (portal, sync, plan, webhooks)
│   ├── p/[id]/             # Public client portal
│   └── page.tsx            # Studio builder
├── components/
│   ├── portal/             # Portal rendering components
│   ├── studio/             # Builder-specific components
│   └── ui/                 # Glass design system primitives
├── config/                 # Plans & theme definitions
├── hooks/                  # Analytics & client hooks
├── lib/                    # Notion parser, storage, export, utilities
└── middleware.ts           # Routing & access gates
```

---

## Roadmap

- [x] Next.js 14 + Tailwind glass tokens
- [x] Notion parser & portal renderer
- [x] Studio builder with branding & themes
- [x] Public portal + API routes
- [x] Plan tiers, checkout, and webhooks
- [x] PDF export & analytics
- [ ] Team accounts & collaboration
- [ ] Multi-page portal navigation

---

## License

Private project. Contact the author for usage permissions.
