# KrishiGuard

A prototype for SIH problem statement **PS-02 — Smart Crop Advisory & Farmer
Distress Early-Warning System**. KrishiGuard is one connected pipeline, not a
set of independent API demos:

```
data.gov.in mandi API ──(2-hour background sync)──→ MandiPrice table
                                                            │
Farmer profile (crop, soil, location, loan) ──┬─→ Weather (Open-Meteo)
                                               ├─→ Market (reads MandiPrice — no live call per request)
                                               ↓
                                      Advisory engine (crop + soil + weather)
                                               ↓
                              Distress feature derivation (rainfall / price / loan signals)
                                               ↓
                                  ML risk model (logistic regression)
                                               ↓
                                 Explainable LOW / MEDIUM / HIGH risk
                                               ↓
                                   Agricultural officer routing (HIGH only)
```

The farmer never types a rainfall deviation percentage, a price-change
percentage, or a "days until loan due" number — those are derived signals,
not form inputs.

## Tech stack

- **Backend**: Fastify 5, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL, Zod 4, TypeScript, `tsx`.
- **Frontend**: Vite, React 19, TypeScript, React Router, Tailwind CSS.
- **ML**: a small logistic regression trained by a self-contained TypeScript script (no ML runtime dependency).

## Architecture

- `farmer.service` — CRUD + geocoding (Open-Meteo Geocoding API) on registration.
- `weather.service` — current weather observation (Open-Meteo Forecast API).
- `rainfall.service` — derives a rainfall-deviation signal from Open-Meteo forecast (recent) + archive (historical baseline) data.
- `mandi-sync.service` — paginates through the full current data.gov.in mandi dataset and upserts it into the local `MandiPrice` table (see "Market data synchronization" below).
- `mandi-scheduler` — runs the sync on startup, then every 2 hours (`setInterval`, no job-queue dependency).
- `market.commodity-map` — the single place farmer-facing crop names (e.g. "Paddy") are translated to data.gov.in commodity names (e.g. "Paddy(Common)").
- `market.state-neighbors` — static, real Indian state-adjacency geography, used only to order the other-state market fallback's preference (never fabricated distance/price data).
- `market.service` — mandi price comparison, read entirely from the local `MandiPrice` table (no live API call per request) + a price-change signal derived from real synchronized records when possible.
- `advisory.service` / `advisory.translation` — rule-based, multilingual advisory using the farmer's crop, soil and current weather.
- `distress.service` — gathers the three signals above from a farmer's existing data, runs the ML model, and returns an explainable risk assessment.
- `ml/risk-model.ts` + `ml/model-artifact.ts` — deterministic inference over weights trained by `scripts/train-risk-model.ts`.
- `agri-officer.service` — sample district → officer directory used for HIGH-risk routing.

## Data model

`Farmer` holds identity, location, an **agricultural profile** (`primaryCrop`,
`soilType`) and a **financial profile** (`hasActiveLoan`, `loanDueDate`,
`loanAmountRupees`). These fields were added directly to `Farmer` rather than
as separate related tables — the prototype's data volume and access patterns
don't justify the extra joins, and Prisma schema comments document the intent
of each field.

`WeatherObservation` logs every weather fetch (non-blocking — a logging
failure never breaks the weather response itself).

`MandiPrice` stores the locally synchronized mandi price snapshot — see
"Market data synchronization" below. Unique on
`(state, district, market, commodity, arrivalDate)` so re-syncing updates
prices in place instead of creating duplicates, with indexes on
`(state, commodity)`, `(state, district, commodity)` and `(arrivalDate)` for
the query patterns `market.service` actually uses.

## Market data synchronization

`POST /api/market` (and the market signal inside `POST /api/distress`) reads
entirely from the local `MandiPrice` table — it never calls data.gov.in
during a request. That table is kept fresh by a background sync:

1. **Scheduler** (`mandi-scheduler.ts`) runs the sync once on server startup,
   then every 2 hours via `setInterval` — no job-queue library, appropriate
   for a single-process prototype backend. It's started from `server.ts`
   only (not `app.ts`), so the test suite — which imports `app.ts` directly
   — never triggers a real sync.
2. **Sync** (`mandi-sync.service.ts`) paginates through the *entire* current
   dataset (not just one state/commodity) by requesting a fixed
   `limit=1000` at `offset=0, 1000, 2000, ...`, continuing until a page
   returns fewer records than requested — never assuming the first page (or
   any fixed page count) is the complete dataset. Before implementing this,
   the API was verified directly to actually honor `offset` (records at
   `offset=0` and `offset=1000` were confirmed to differ). Each valid
   record is upserted; malformed records (missing fields, non-numeric
   prices, unparseable dates) are skipped and counted, never inserted as
   garbage or allowed to fail the whole sync.
3. **Known API limit**: the underlying Elasticsearch index behind this
   resource enforces a hard `index.max_result_window` of 10,000 — `offset +
   limit` beyond that returns an HTTP 200 with an error body instead of more
   data (confirmed directly against the live API: on the day this was
   measured, `total: 10037`, so pagination legitimately cannot reach the
   last 37 records through this endpoint). This is not treated as a special
   case — it fails response-shape validation like any other malformed
   response, so the sync fails cleanly at that point: logged, and every
   record upserted before the failure (as well as everything from prior
   successful syncs) is left exactly as it was. Nothing is silently dropped
   to "just the first page," and nothing is wiped.
4. **Failure handling**: if a sync fails (timeout, non-200, malformed
   response shape) partway through, everything upserted before the failure
   stays committed, and everything from prior successful syncs is left
   completely untouched — the table is never wiped. `POST /api/market`
   keeps serving the last successful snapshot.
5. **Commodity normalization** (`market.commodity-map.ts`) is the single
   place farmer-facing crop names are translated to data.gov.in commodity
   names — e.g. "Paddy" → "Paddy(Common)" (confirmed live: "Paddy" alone
   returns 0 records for this resource; "Rice" is a distinct, unmapped
   commodity and must never be conflated with "Paddy(Common)").
6. **Geographic fallback** — `market.service.ts` tries three tiers, in
   order, before giving up:
   1. `DISTRICT` — the farmer's own district.
   2. `STATE` — elsewhere in the farmer's own state, clearly labeled
      "Other {state} markets" (never presented as the farmer's local price).
   3. `OTHER_MARKETS` — real records from other states (capped at 10),
      preferring real neighboring states (`market.state-neighbors.ts`, a
      static geography lookup — Odisha's real neighbors are West Bengal,
      Jharkhand, Chhattisgarh, Andhra Pradesh) when the farmer's state has
      listed neighbors, otherwise any other state. Clearly labeled "Other
      markets," and its `priceChangePercent` is always `null` — cross-state
      prices are real data, useful to look at, but are never used as this
      farmer's local price-change signal (and therefore never reach the
      distress model, which only trusts a non-null value).
   Only when all three tiers are empty does the response become `NO_DATA`.

## Farmer analysis freshness (6-hour policy)

`GET /api/farmers/:id/analysis` (`farmer-analysis.service.ts`) is what lets
the frontend show a farmer's Market + Advisory + Distress results
immediately on revisit — page reload, browser restart, another device —
without a manual "Check" click every time.

- **Persisted, not client-side**: a `FarmerAnalysis` row (Postgres, one per
  farmer, `market/advisory/distressResult` as JSON + `lastSuccessAt`) is the
  source of truth. Nothing about freshness lives in localStorage.
- **6 hours from the last *successful* refresh** — never from page load,
  and a failed attempt never advances it.
- **Coherent, all-or-nothing refresh**: Market, Advisory and Distress are
  recomputed together inside one `Promise.all`. If any of the three throws,
  none of the three are persisted — the previous complete set stays exactly
  as it was. This is what prevents a Market-is-new-but-Distress-is-old
  mismatch; there is no code path that persists a partial update.
- **Failure is visible, not silent**: a failed refresh records `lastError`
  and `lastAttemptAt` without touching `lastSuccessAt` or the prior results.
  The frontend shows "Last updated Xh ago · Unable to refresh" with a Retry
  button, which is just calling the same endpoint again (it naturally
  retries because the snapshot is still stale).
- **Manual per-page actions are separate and unaffected**: "Check prices"
  for a different crop, "Regenerate now", "Reassess now" still call the
  original `POST /api/market` / `/api/advisory` / `/api/distress` endpoints
  directly and display an on-demand result — they do not update the
  persisted snapshot or its freshness timer, by design, so exploring a
  different crop can never silently overwrite the farmer's official
  6-hour-cached analysis.

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL and DATA_GOV_API_KEY
npx prisma migrate dev
npm run train:model    # generates src/ml/model-artifact.ts (already checked in, but reproducible)
npm run dev
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## Environment variables

Backend (`backend/.env`, see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma). `docker-compose.yml` provides a local Postgres 17 for dev. |
| `PORT` | Backend HTTP port (default 8000). |
| `DATA_GOV_API_KEY` | Key for the data.gov.in mandi resource, used by the **background sync** (every 2h). Without it, the sync is skipped (logged, not fatal) and `/api/market` honestly reports `NO_DATA` / serves whatever was previously synced, rather than fabricating prices. |

Frontend (`frontend/.env`): `VITE_API_BASE_URL` — the backend's base URL.

## Database setup

```bash
cd backend
npx prisma migrate dev   # applies all migrations, including add_agricultural_and_financial_profile, add_mandi_price_table, add_farmer_analysis_snapshot
```

## External APIs

- **Open-Meteo Forecast API** — current weather + recent (past 14 days) rainfall.
- **Open-Meteo Archive (historical) API** — 3-year rainfall baseline for the deviation signal.
- **Open-Meteo Geocoding API** — village/district/state → coordinates on registration.
- **data.gov.in mandi resource** (`9ef84268-d588-465a-a308-a864a43d0070`) — real mandi price records.

All external calls use an 8-second (5s for geocoding) `AbortSignal.timeout`,
validate `response.ok` and the response shape, and fail closed rather than
fabricating data. Geocoding additionally retries once on a network-level
failure before giving up.

`src/app.ts` sets `dns.setDefaultResultOrder("ipv4first")` and
`net.setDefaultAutoSelectFamily(false)` at startup. Some environments
advertise IPv6 (AAAA) DNS records for these APIs while actually having no
working IPv6 route; Node's `fetch` then wastes its connection budget on IPv6
before falling back to IPv4, surfacing as intermittent `fetch failed`
errors. This was measured directly during development (see `FINAL_AUDIT.md`
§13): ~1/8 outbound calls succeeded without the fix, 10/10 with it.

## Data sources — what's real vs. simulated

| Value | Source |
|---|---|
| Temperature / humidity / rain / wind | **Real** — Open-Meteo current weather |
| Rainfall deviation baseline | **Real** — Open-Meteo archive API, averaged over the same 14-day calendar window across the last 3 years. Falls back to an explicitly labeled flat demo baseline (`source: "DEMO_BASELINE_FALLBACK"`) only if the real historical data can't be fetched. |
| Mandi prices (highest/lowest/average) | **Real** — data.gov.in, synchronized into the local `MandiPrice` table every 2 hours and served from there (never fabricated, never live-fetched per request). |
| Market price-change % | **Real when derivable** — computed from distinct arrival dates stored across sync runs. Each sync only captures the government resource's current daily snapshot, so a change % becomes available as multiple days accumulate in the local table over time; on a single day it's genuinely unavailable — reported as `null`, never invented. |
| Loan due date / amount | **Simulated/demo** — stored on the farmer's own record, entered at registration. No real bank or government financial record is ever accessed. Days-until-due is calculated by the backend, never typed in. |
| Distress risk score | **Real inference** from a **prototype ML model trained on synthetic data** (see below) — not a black-box magic number. |
| Officer contact info | **Sample directory** (`agri-officer.service.ts`) — three demo officers for Odisha districts. Not a live government directory. |

## How distress risk is calculated

`POST /api/distress` takes only `{ farmerId }`. The backend:

1. Derives a **rainfall signal** from the farmer's coordinates (or reports it honestly unavailable if the farmer has no resolved location).
2. Derives a **market signal** from data.gov.in mandi records for the farmer's `primaryCrop`.
3. Derives a **loan-proximity signal** from `hasActiveLoan` / `loanDueDate` on the farmer's own record.
4. Feeds all three into a **logistic regression** (`ml/risk-model.ts`) that outputs a probability, mapped to `riskScore` (0–100) and `riskLevel` (LOW < 33%, MEDIUM 33–66%, HIGH ≥ 66%).
5. Returns per-factor contribution shares and human-readable `reasons` built from the actual derived values — never placeholder text.
6. On `HIGH`, looks up an officer for the farmer's district and returns `{status: "ROUTED", officer}` or an honest `{status: "NO_OFFICER_FOUND"}` if none is registered.

### The ML model

- **Type**: logistic regression over 3 engineered features — rainfall drought severity, price-crash severity, loan urgency (all 0–1).
- **Training data**: **synthetic**, generated by `scripts/train-risk-model.ts` from a documented generative rule (`bias=-2.5, rain=3.0, price=2.5, loan=2.0`) plus Bernoulli sampling noise — there is no real historical farmer-distress dataset available for this SIH prototype, which the problem statement's own implementation notes explicitly permit.
- **Training**: batch gradient descent with L2 regularization, implemented in plain TypeScript (no ML runtime dependency), 4000 samples, 80/20 train/test split.
- **Measured evaluation** (held-out 20% split, decision threshold 0.5 — see `src/ml/model-artifact.ts` for the exact numbers from the last training run): accuracy ≈ 78%, precision ≈ 0.60, recall ≈ 0.17, F1 ≈ 0.27. Recall at a binary 0.5 threshold is low largely because of label noise near the decision boundary in the synthetic generator (the product itself uses the continuous probability directly with LOW/MEDIUM/HIGH bands, not a binary 0.5 cutoff). These are the actual measured numbers — not a marketing claim.
- **Reproducible**: `npm run train:model` regenerates `src/ml/model-artifact.ts` deterministically (fixed PRNG seed).
- This is a **prototype model for a hackathon demo** — not a clinically or financially validated predictor.

## How to run locally

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Open the frontend's printed URL, register a farmer, and walk through
Dashboard → Weather → Advisory → Market → Distress.

## How to test

```bash
cd backend
npm test                 # 57 tests: farmer/weather/market/mandi-sync/advisory/distress/ML/analysis-freshness, node:test + Fastify inject
npx tsc --noEmit         # backend typecheck
npm run build             # backend production build

cd ../frontend
npx tsc -b                # frontend typecheck
npm run build              # frontend production build
```

Backend tests hit the real external APIs (Open-Meteo, data.gov.in) for
integration coverage, plus a handful of `globalThis.fetch` stubs to
deterministically exercise upstream-failure / timeout / malformed-response
paths without depending on those services actually being down.

## Known prototype limitations

- **Market price-change signal** starts unavailable on a fresh database
  because the data.gov.in resource only exposes the current day's snapshot
  per sync — a real day-over-day comparison needs the local `MandiPrice`
  table to accumulate more than one day's worth of syncs first. The system
  reports this honestly (`priceChangePercent: null`) rather than inventing a
  number, and it will start appearing naturally once the app has been
  running (and syncing every 2 hours) across more than one calendar day.
- **data.gov.in's own pagination window** is capped at 10,000 results for
  this resource (an Elasticsearch `index.max_result_window` limit, not
  something this app controls). On a day where the true total exceeds
  10,000 (10,037 on the day this was measured), the sync legitimately
  cannot reach the last ~37 records through this endpoint — it fails
  cleanly at that boundary (logged; previously synced data, including the
  ~10,000 records upserted earlier in that same run, is left exactly as it
  was) rather than fabricating or silently dropping the remainder.
- **Rainfall baseline** depends on Open-Meteo's archive API being reachable;
  if it isn't, the system uses an explicitly labeled flat demo baseline
  rather than fabricating a location-specific one.
- **Officer directory** is a small hardcoded sample (3 Odisha districts), not
  a live government registry.
- **No authentication** — this is an intentional prototype-scope limitation,
  not an oversight. Any deployment beyond a local/judged demo needs an auth
  layer in front of these endpoints.
- **Voice advisory** is not implemented. Text advisory is delivered in the
  farmer's selected language (English/Odia/Hindi); voice synthesis would be
  a natural extension point (e.g. at the advisory API boundary), but was not
  built to avoid an unreliable feature displacing time from core pipeline
  correctness.
- **ML model** is trained on synthetic data with modest held-out recall at a
  binary 0.5 threshold (see metrics above) — an honest limitation of a
  hackathon-scope prototype with no real training data.
- **HIGH-risk officer routing** is implemented and directly unit-tested
  (`test/risk-model.test.ts`), but was not observed to fire end-to-end from
  live-derived signals during development — real weather/market conditions
  for the demo farmers used didn't happen to combine into a HIGH assessment.
  The routing logic itself does not depend on how a farmer reached HIGH.
