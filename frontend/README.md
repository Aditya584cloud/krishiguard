# KrishiGuard — Frontend

React + Vite + TypeScript + Tailwind frontend for KrishiGuard (SIH PS-02).
See `../backend/README.md` for the full project overview, architecture, data
sources, and how the distress risk model works.

## Setup

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck (`tsc -b`) + production build.
- `npm run lint` — Oxlint.
- `npm run preview` — preview the production build locally.

## Pages

Dashboard, Farmers, Weather, Market, Advisory, Distress — all reading from a
single centralized, typed API client (`src/api/client.ts`) and a shared
farmer-selection context (`src/context/AppContext.tsx`). The Distress page
takes no manual numeric inputs — rainfall, market and loan signals are all
derived server-side from the selected farmer's existing profile and data.

## Design system

Shared, reusable primitives in `src/components/`: `Card`/`Stat`, `Badge`,
`Button` (with a built-in loading spinner), `PageHeader`, `RiskPill`/
`RiskPanel` (the risk-level/score/tone logic used on both the Dashboard and
Distress page), `Skeleton`/`SkeletonCard`/`ErrorState`/`EmptyState`, and a
small hand-drawn `icons.tsx` set (no icon-library dependency). Tailwind v4
theme tokens live in `src/index.css` (`soil`/`leaf`/`wheat`/`sky`/`danger`
color scales).

## End-to-end verification

Two Playwright scripts (no test framework, since neither existed before —
this project has no `npm test`; verification is `tsc` + `build` + `lint` +
these scripts against real running dev servers):

```bash
node e2e/walkthrough.mjs           # functional flow: register → dashboard →
                                    # weather → advisory → market → distress
                                    # (asserts zero manual numeric inputs) →
                                    # farmer switch → refresh persistence
node e2e/visual-walkthrough.mjs    # screenshots every page at desktop/
                                    # laptop/small-laptop/mobile widths,
                                    # exercises loading/empty/NO_DATA states
```

Both require the backend (`:8000`) and frontend (`npm run dev`, `:5173`)
running, and Chromium's system libraries installed
(`sudo npx playwright install-deps chromium`).
