# Generative UI Playground — Demo Walkthrough

Interview / hiring demo for the GlassPortal GenUI workbench.

## What to show (3 minutes)

1. **Generate** — `/generative-ui`  
   Open Workspace → Sample (or Generate with a live key).  
   Preview fills the screen; Night Sky / Minimal / Modern SaaS / Editorial.

2. **Critique → Fix** — Critique tab  
   Sample starts incomplete (missing transactions table).  
   Critique scores six dimensions → Fix → table appears, score improves, “Preview updated”.

3. **Human-in-the-loop** — Mark  
   Mark → drag a circle on a block → type e.g. “变一下这个红色” → Fix.

4. **Eval Dashboard** — `/generative-ui/dashboard`  
   Run 20 evals → style averages, before/after Δ → export JSON/CSV.

5. **Inspector** — `/generative-ui/inspector?run=…`  
   Component tree for a saved run (whitelist nodes only).

## Honesty rules

- Scores come from deterministic rules and/or a real server LLM.  
- No fabricated evaluation numbers.  
- Without `OPENAI_API_KEY`, Sample / fixture + rule critique still demo the full loop.

## Env (server only)

```
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.groq.com/openai/v1
GENUI_MODEL=openai/gpt-oss-20b
```

## Deploy checklist

1. Merge PR to `main`.  
2. Ensure Vercel (or host) has the env vars above.  
3. Smoke: `/`, `/p/demo`, `/generative-ui`, `/generative-ui/dashboard`.  
4. Optional: Dashboard → Run 20 evals on production.
