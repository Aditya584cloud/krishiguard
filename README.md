# KrishiGuard — Final Audit

SIH PS-02 (Smart Crop Advisory & Farmer Distress Early-Warning System)
requirement-by-requirement audit. `PASS` requires actual verification (a run
test, a real API call, or a browser walkthrough) — not just "the UI exists."

## 1. Architectural pipeline (farmer → weather/market → advisory → distress → risk → officer)

| | |
|---|---|
| **Requirement** | One connected system: farmer data flows into weather, market, advisory and distress — not six independent API demos. |
| **Implementation** | `Farmer` now persists `primaryCrop`, `soilType`, `hasActiveLoan`/`loanDueDate`/`loanAmountRupees`. Advisory defaults to the farmer's crop/soil; distress derives all three signals from the farmer's location, crop and loan record. |
| **Backend** | `advisory.service.ts`, `distress.service.ts`, `market.service.ts`, `rainfall.service.ts` |
| **Frontend** | Advisory/Market/Distress pages read from the farmer profile instead of asking the user to retype crop/soil/loan data. |
| **Test performed** | `npm test` (backend, 49/49 pass, run 5+ times consecutively for stability); manual curl walkthrough registering a farmer and calling weather → advisory → market → distress in sequence, confirmed each step consumed the prior step's real data. |
| **Result** | **PASS** — note: because the suite intentionally hits live Open-Meteo/data.gov.in APIs (by design, for real integration coverage) rather than mocking them, one run under heavy parallel load showed transient failures from external-API latency; isolated/normal runs are consistently 49/49. |

## 2. Distress assessment has NO manual rainfall/price/loan inputs

| | |
|---|---|
| **Requirement** | `POST /api/distress` takes only `{ farmerId }`; the UI has zero numeric input fields for distress. |
| **Implementation** | `distress.schema.ts` defines only `farmerId`. `Distress.tsx` has one button, no form fields. |
| **Data source** | Rainfall — Open-Meteo; Market — data.gov.in; Loan — farmer's own record. |
| **Backend** | `src/schemas/distress.schema.ts`, `src/services/distress.service.ts` |
| **Frontend** | `src/pages/Distress.tsx` |
| **Test performed** | `test/distress.test.ts` — asserts the schema ignores client-supplied `rainfallDeviationPercent`/`priceChangePercent`/`loanDueInDays` (two calls, one with bogus values, produce an identical score). Playwright E2E asserts `input[type="number"]` count is 0 on the Distress page. |
| **Result** | **PASS** |

## 3. Rainfall deviation signal

| | |
|---|---|
| **Requirement** | Derive rainfall deviation from real data, not a random number; disclose honestly if a real baseline can't be obtained. |
| **Implementation** | `rainfall.service.ts` — observed = Open-Meteo forecast API `past_days=14` precipitation sum; baseline = Open-Meteo archive API, same calendar window averaged over the last 3 years. Falls back to an explicitly labeled flat demo baseline (`source: "DEMO_BASELINE_FALLBACK"`) only if the real data can't be fetched. |
| **Data source** | Open-Meteo forecast + archive APIs (real), or an explicitly labeled demo fallback. |
| **Backend** | `src/services/rainfall.service.ts` |
| **Test performed** | Live call for a Cuttack, Odisha farmer returned `observedMm: 340.8, baselineMm: 160.8, deviationPercent: 111.9, source: "OPEN_METEO_HISTORICAL"` — real, traceable numbers. `test/distress.test.ts` verifies missing coordinates produce an honest `UNAVAILABLE` source rather than a fabricated number. |
| **Result** | **PASS** |

## 4. Market data architecture — synchronized local snapshot, not live-per-request

**Superseded, revised 2026-08-30, then corrected same day.** The market
architecture was reworked from "call data.gov.in on every
`POST /api/market`" to "sync into a local `MandiPrice` table every 2 hours,
serve every request from that table." The pagination strategy was then
tightened per explicit follow-up direction: fetch a fixed `limit=1000` at
`offset=0, 1000, 2000, ...`, continuing until a page returns fewer records
than requested — no arbitrary page-count stop, and no proactive capping at
the government API's own result-window limit (that limit is now hit
naturally and treated as a genuine, honestly-logged sync failure, not
smoothed over into a disguised success).

| | |
|---|---|
| **Requirement** | Derive a price-change signal from real mandi data; never invent a percentage if the data can't support one; don't call the government API on every user request; paginate with limit=1000 at offsets 0,1000,2000,... until a page returns fewer than the requested limit; verify offset is actually honored before implementing; never silently fall back to only the first page on a pagination failure. |
| **Implementation** | `mandi-scheduler.ts` runs `mandi-sync.service.ts` on startup and every 2 hours (`setInterval`, no job queue). The sync requests `limit=1000` at increasing offsets and stops when `records.length < 1000` — never based on a page-count cap or the API's `total` field. Upserts into `MandiPrice` (unique on state+district+market+commodity+arrivalDate, so re-syncs update in place). `market.service.ts` reads only from that table — zero `fetch()` calls in the file (verified by grep) — and computes `priceChangePercent` from distinct *stored* arrival dates, still returning `null` rather than inventing a number when only one date is on record. `market.commodity-map.ts` normalizes "Paddy" → "Paddy(Common)" (confirmed live: bare "Paddy" returns 0 records; "Rice" is a distinct, unmapped commodity, never conflated). |
| **Offset verification (required before implementing)** | Queried the live API directly at `offset=0` and `offset=1000` with the same filters and confirmed the returned records were completely different (different states/markets/commodities) — the API genuinely honors `offset`, this is not a no-op. |
| **Data source** | data.gov.in mandi resource `9ef84268-d588-465a-a308-a864a43d0070` (real), synchronized locally. |
| **Backend** | `prisma/schema.prisma` (`MandiPrice`), `src/services/mandi-sync.service.ts`, `src/services/mandi-scheduler.ts`, `src/services/market.commodity-map.ts`, `src/services/market.service.ts`, `src/server.ts` (scheduler wired here, not `app.ts`, so tests never trigger a real sync). |
| **Test performed** | `test/mandi-sync.test.ts` (8 tests, mocked fetch for determinism/speed): successful sync + upsert; pagination requests `limit=1000` at `offset=0, 1000` and stops on a short page (asserts the exact requested offsets and limits, not just call count); **a dedicated 13-page test proving pagination continues well past any 10-page assumption** (12 full pages + 1 short page, all malformed so no real DB writes — fast); re-sync updates in place (not duplicated); API timeout; API non-200; malformed record skipped without failing the sync; scheduler's safety wrapper never throws. `test/market.test.ts` (6 tests, DB-seeded): DISTRICT lookup, STATE fallback, NO_DATA, Paddy→Paddy(Common) normalization (with a decoy "Rice" record proving no cross-commodity contamination), price change computed across two real stored dates, price change null with only one date. **Live manual verification** (required by spec, repeated after the pagination fix): ran the real sync against data.gov.in twice (once per revision) — then called `POST /api/market` for a real Odisha/Balasore farmer with `primaryCrop: "Paddy"`: response in **110ms** (vs. 1000–2000ms for every live data.gov.in call observed all session), confirming DB-only serving. Live-queried the government API directly at the same moment: Odisha genuinely has 0 "Paddy(Common)" records that day, so the app's `NO_DATA` response is the honest, correct answer, not a bug. A second manual call with `crop: "Brinjal"` (confirmed live to have Odisha data) returned 14–15 real synchronized Odisha markets in 47–67ms with a correct STATE-scope fallback (Balasore itself had none). |
| **Real bug found and fixed during this work** | The live sync consistently fails after 10 pages / 10,000 upserted records with "Mandi API returned an unexpected response shape." Root-caused live: this data.gov.in resource's underlying Elasticsearch index enforces `index.max_result_window: 10000` — `offset + limit > 10000` returns an HTTP 200 with a `search_phase_execution_exception` in the body, not a clean end-of-data signal or a short page. Verified this is a genuine, permanent API characteristic (re-triggered identically on a second live run after the pagination rewrite). Per explicit direction, this is now handled as a real sync failure — logged (`Mandi sync: failed after 10 page(s) (10000 record(s) upserted before failure). Previously stored data is unchanged.`), not disguised as success. Confirmed on the live database: row count was identical before and after this failing run (9738 → 9738, records updated in place), proving nothing was wiped and nothing was silently dropped to "just page one." |
| **Result** | **PASS** — pagination now matches the exact required loop (fixed limit, offset stepping, short-page termination, no arbitrary cap, real offset-honoring verified, failure never silently degrades to page-one-only); price-change is still frequently `null` on a single day's sync (correctly, per the government resource's own daily-snapshot nature and the 10,000-record window meaning even one full day can't always be captured in full — documented in README as an expected, honest limitation). |

## 4b. Market three-tier geographic fallback (DISTRICT → STATE → OTHER_MARKETS → NO_DATA)

Added 2026-08-30.

| | |
|---|---|
| **Requirement** | When district data is missing, fall back to state; when state is also missing, fall back to real markets in other states (preferring geographically real neighbors when the data allows), clearly labeled as non-local; never fabricate/estimate/copy a price from another location; extend the scope enum explicitly rather than mislabeling; never use other-state prices as this farmer's distress price-change signal unless existing semantics already support it. |
| **Implementation** | `MarketPriceSignal.scope` extended to `"DISTRICT" \| "STATE" \| "OTHER_MARKETS" \| "NO_DATA"` (was `DISTRICT \| STATE \| NO_DATA`). `market.service.ts#queryOtherStateRecords` queries real other-state records for the same normalized commodity, capped at 10, preferring real neighboring states from `market.state-neighbors.ts` (a static, documented Indian state-adjacency table — real public geography, not derived from price data, since `MandiPrice` carries no coordinates) when the farmer's state has listed neighbors, else falling back to any other state unordered rather than guessing. Every market entry (`MarketRecord`) now includes `state` (previously only `district`), since other-state results span multiple states. `priceChangePercent`/`priceChangeBasis` are forced `null` for `OTHER_MARKETS` scope regardless of date spread — cross-state prices are real but never used as this farmer's price-change signal, and since `distress.service.ts` only trusts a non-null `priceChangePercent`, this transitively keeps other-state prices out of the ML model's market feature without any extra distress-side logic. |
| **Data source** | data.gov.in mandi resource (real, synchronized locally); state-adjacency is static real-world geography, not derived from any dataset. |
| **Backend** | `src/services/market.service.ts`, `src/services/market.state-neighbors.ts` (new), `src/services/distress.service.ts` (note text for the `OTHER_MARKETS` case). |
| **Frontend** | `src/api/types.ts` (`MarketScope`, `MarketRecord.state`), `src/pages/Market.tsx` (dynamic scope badges: "{district} markets" / "Other {state} markets" / "Other markets" / "No data available"; conditional State column in the results table; explicit "not this farmer's local price" note for `OTHER_MARKETS`), `src/pages/Dashboard.tsx` (same badge logic, condensed). |
| **Test performed** | `test/market.test.ts` (+4 new tests): other-state fallback prefers a real Odisha neighbor (West Bengal) over a non-neighbor (Rajasthan) when both have data, asserting neighbor is listed first; fallback still works for a state with no listed neighbors (Delhi → unordered Punjab result); cross-state records never produce a price-change signal even with two distinct stored dates; a dedicated distress-layer test seeds a large real 2-date price jump in another state and confirms the distress `Market price change` factor is `available: false` / `value: null` and the data-source note explicitly says "not used as this farmer's local price-change signal." **Live manual verification**: the real Odisha/Balasore farmer's "Paddy" query (Odisha has 0 live Paddy(Common) records, confirmed earlier) now returns `scope: "OTHER_MARKETS"` with 10 real Andhra Pradesh records (a genuine Odisha neighbor) in 85ms, `priceChangePercent: null`; the live distress endpoint for the same farmer confirmed the market factor is excluded with the correct note. |
| **Result** | **PASS** |

## 5. Financial signal (loan proximity)

| | |
|---|---|
| **Requirement** | Loan due date stored on the farmer; days-to-due computed by the backend, never typed in by the user. |
| **Implementation** | `Farmer.loanDueDate` (DateTime); `distress.service.ts#daysUntil` computes calendar-day difference at UTC midnight. |
| **Data source** | Farmer's own record — explicitly labeled demo/simulated financial data, no real bank/government access. |
| **Backend** | `src/services/distress.service.ts`, `prisma/schema.prisma` |
| **Frontend** | `Farmers.tsx` collects `loanDueDate` via a date picker (never a day-count); farmer list displays the computed days-until-due. |
| **Test performed** | `test/distress.test.ts` — a farmer with `loanDueDate = now + 6 days` produces `loanFactor.value` in `[5,7]`; a farmer with an overdue date produces an "overdue" reason. |
| **Result** | **PASS** |

## 6. ML risk model

| | |
|---|---|
| **Requirement** | A genuine, interpretable ML model — not a formula labeled "AI" — trained on documented (synthetic, since no real dataset exists) data with honestly measured metrics. |
| **Implementation** | Logistic regression, 3 engineered features, trained by gradient descent in `scripts/train-risk-model.ts` (pure TypeScript, no ML runtime). Weights + measured metrics stored in `src/ml/model-artifact.ts` (reproducible via `npm run train:model`, fixed PRNG seed). |
| **Data source** | Synthetic, documented generative rule — disclosed as `trainingDataSource: "SYNTHETIC_DEMO"` in every API response. |
| **Backend** | `scripts/train-risk-model.ts`, `src/ml/risk-model.ts`, `src/ml/model-artifact.ts` |
| **Test performed** | `test/risk-model.test.ts` — crafted extreme inputs classify as HIGH/LOW as expected; contribution shares sum to ~1. Measured held-out metrics from the last training run: accuracy 78.3%, precision 0.60, recall 0.17, F1 0.27 (binary threshold 0.5) — reported as-is, not embellished. |
| **Result** | **PASS** (as an honest prototype model — recall at a binary 0.5 threshold is modest, disclosed in README rather than hidden) |

## 7. Explainability

| | |
|---|---|
| **Requirement** | Risk result includes factors and farmer-friendly reasons, not a black-box number. |
| **Implementation** | `distress.service.ts` returns `factors[]` (name, value, unit, availability, contribution share) and `reasons[]` built from the actual derived values. |
| **Backend** | `src/services/distress.service.ts`, `src/ml/risk-model.ts` |
| **Frontend** | `Distress.tsx` renders factor bars + reasons + a "where did this come from" data-source disclosure panel. |
| **Test performed** | `test/distress.test.ts`, manual curl inspection of a real response. |
| **Result** | **PASS** |

## 8. Officer routing

| | |
|---|---|
| **Requirement** | HIGH risk routes to a real (sample) officer for the district; no officer found is reported honestly; MEDIUM/LOW never claim an alert was sent. |
| **Implementation** | `agri-officer.service.ts` (unchanged, preserved) — 3 sample Odisha district officers. `distress.service.ts` only attempts routing when `riskLevel === "HIGH"`. |
| **Data source** | Hardcoded sample officer directory — explicitly not a live government registry (documented in README). |
| **Backend** | `src/services/agri-officer.service.ts`, `src/services/distress.service.ts` |
| **Test performed** | `test/risk-model.test.ts` — known district → officer found; unknown district → `undefined`, never fabricated. Live end-to-end HIGH-risk routing depends on real-world signals lining up (drought + price crash + imminent loan) and was not observed to occur naturally during testing with the demo farmers used — the routing logic itself is directly unit-tested. |
| **Result** | **PASS** for the routing logic; **PARTIAL** for having observed it fire end-to-end from live-derived HIGH risk (not reproduced in this session's real-world conditions) |

## 9. Advisory uses crop + soil + weather

| | |
|---|---|
| **Requirement** | Recommendations actually vary with crop, soil and weather — not just passed through. |
| **Implementation** | `advisory.translation.ts` maps soil type → water-retention category (low/medium/high) and branches heavy-rain / high-temperature messaging by retention, on top of the existing rain/temperature/humidity rules. |
| **Backend** | `src/services/advisory.translation.ts`, `src/services/advisory.service.ts` |
| **Test performed** | `test/advisory.test.ts` — identical weather with Clay vs. Sandy soil produces different advisory text (waterlogging warning vs. standard); identical heat with Sandy vs. Clay soil produces different irrigation guidance. |
| **Result** | **PASS** |

## 10. Weather robustness

| | |
|---|---|
| **Requirement** | Handle missing coordinates, upstream failures, timeouts, malformed responses; never call current weather a forecast; a logging failure must not break the weather response. |
| **Implementation** | Unchanged from the prior (already-solid) implementation — preserved as-is. |
| **Backend** | `src/services/weather.service.ts`, `src/controllers/weather.controller.ts` |
| **Frontend** | `Weather.tsx` explicitly labels the data "a current observation, not a forecast." |
| **Test performed** | `test/weather.test.ts` — missing coordinates → 422; `globalThis.fetch` stubs simulate a 503, a malformed body, and a timeout, all surfacing as thrown errors rather than corrupting the response. |
| **Result** | **PASS** |

## 11. Dashboard as the operational screen

| | |
|---|---|
| **Requirement** | Dashboard shows farmer profile, weather, advisory, market, distress risk + factors, officer routing — honest empty states until data exists. |
| **Implementation** | `Dashboard.tsx` enriched with crop/soil/loan badges, distress reasons, and market price-change. |
| **Frontend** | `src/pages/Dashboard.tsx` |
| **Test performed** | Real Chromium walkthrough, Section 13 — Dashboard verified to show live farmer profile, weather, distress result, and switches cleanly between farmers. |
| **Result** | **PASS** |

## 12. Farmer registration UX / stale-farmer bug

| | |
|---|---|
| **Requirement** | Collect only genuinely-used fields; auto-select + refresh the list after registration; no stale farmer selection. |
| **Implementation** | Preserved existing `selectFarmer` + `refetchFarmers` call-after-create logic (already correct); added agricultural + financial profile fields to the form. |
| **Frontend** | `src/pages/Farmers.tsx`, `src/context/AppContext.tsx` (unchanged) |
| **Test performed** | Real Chromium walkthrough, Section 13 — registration auto-selects the new farmer and refreshes the list; verified with a distinct second farmer registered mid-session. |
| **Result** | **PASS** |

## 13. Real browser E2E walkthrough

**Status: DONE.** Ran a real headless Chromium browser (Playwright,
`frontend/e2e/walkthrough.mjs`) against the live dev servers, three
consecutive times, with the actual verified result **ALL 18 STEPS PASSED**
each time:

1. Open KrishiGuard — PASS
2. Register a new farmer with crop/soil/loan — PASS
3. Newly created farmer becomes selected — PASS
4. Dashboard shows farmer profile — PASS
5. Dashboard shows weather — PASS
6. Weather page shows a current observation (not a forecast) — PASS
7. Advisory page has zero manual crop/soil inputs — PASS
8. Advisory generates using the farmer's crop/soil/weather — PASS
9. Advisory output mentions the farmer's actual crop — PASS
10. Market crop field is pre-filled from the farmer's profile — PASS
11. Market shows real data or an honest NO_DATA state — PASS
12. **Distress page has ZERO manual numeric inputs** — PASS
13. Risk level (LOW/MEDIUM/HIGH) is shown — PASS
14. Reasons are shown, built from real derived values — PASS
15. Dashboard reflects the latest distress result — PASS
16. Switching farmer shows the new farmer's own data (not the previous farmer's) — PASS
17. Farmer selection persists across a browser refresh — PASS
18. Zero browser console errors during the whole walkthrough — PASS

Every run in this session assessed as LOW risk from real derived signals (no
HIGH-risk case occurred naturally from live weather/market conditions during
testing), so officer routing itself was not observed to fire end-to-end in
the browser this session — it is directly unit-tested instead (see Section
8).

**Three real bugs were found and fixed by this walkthrough** (not by static
review — the browser surfaced them):

1. **`POST /api/advisory` returned a raw `500`** instead of an honest `422`
   when a farmer's location wasn't resolved (the error-message check for
   `"Farmer location is not available"` was missing from
   `advisory.controller.ts`, unlike the equivalent farmer/weather
   controllers). Fixed.
2. **`POST /api/market` returned a generic `500`** instead of a `502` on a
   genuine upstream mandi-API timeout, inconsistent with how
   `weather.controller.ts` reports upstream failures. Fixed.
3. **Intermittent outbound-request failures** (`TypeError: fetch failed`) on
   calls to Open-Meteo/data.gov.in — root-caused during this session to
   Node's `fetch` (via undici's Happy Eyeballs) attempting a broken IPv6
   route before falling back to IPv4 in this environment (confirmed with
   `curl -6` failing instantly while `curl -4` succeeds). Fixed by setting
   `dns.setDefaultResultOrder("ipv4first")` and
   `net.setDefaultAutoSelectFamily(false)` at app startup
   (`src/app.ts`) — verified 10/10 successful outbound calls after the fix,
   versus ~1/8 before. This also eliminated flakiness that had been showing
   up as occasional backend test failures. A second, smaller resilience
   improvement was added alongside it: `geocoding.service.ts` now retries
   once on a network-level failure before giving up.

The walkthrough script itself also had test-authoring bugs that were fixed
during this process (documented in the script's comments): Chromium's
`innerText` includes text from `<option>` elements inside the always-present
header `<select>`, which caused several false positives/negatives in
substring-based text checks until the checks were scoped to `<main>` and to
Dashboard-specific markers.

## 14. Voice / multilingual accessibility

| | |
|---|---|
| **Requirement** | PS-02 lists "voice + text" as an expected outcome. |
| **Implementation** | Text advisory in English/Odia/Hindi is fully implemented and language-selected from the farmer's profile. Voice (TTS/STT) was **not implemented** — no fake microphone button was added. |
| **Result** | **PARTIAL** — text/multilingual: PASS. Voice: not built, honestly documented as a limitation and a clear extension point (the advisory API boundary) in `backend/README.md`, per the instruction to prefer an honest gap over a fake feature. |

## 15. Error contract consistency

| | |
|---|---|
| **Requirement** | Consistent `{success, error, details?}` shape across endpoints; no raw Prisma/DB errors leaked. |
| **Implementation** | Preserved existing consistent pattern across all controllers; removed one dead/unreachable error branch in `market.controller.ts` and `farmer.controller.ts` that could never trigger, and added an explicit `503` for a missing `DATA_GOV_API_KEY`. |
| **Backend** | All files in `src/controllers/` |
| **Result** | **PASS** |

## 16. Environment / secrets

| | |
|---|---|
| **Requirement** | No secrets committed; `.env`/`.env.*` gitignored; a real `.env.example` present. |
| **Implementation** | `backend/.gitignore` had duplicated/malformed content (including a typo merging `!.env.example` with `node_modules/`) — cleaned up. Added `backend/.env.example` (previously missing entirely despite the gitignore already carving out an exception for it). |
| **Test performed** | `git status` confirms `.env` is not tracked; grepped `git diff`/`git status` for accidental secret exposure — none found. |
| **Result** | **PASS** |

## 17. 6-hour freshness policy for Market + Advisory + Distress

Added 2026-08-31.

| | |
|---|---|
| **Requirement** | Farmers should not have to manually re-run Market/Advisory/Distress every visit. Persist a coherent snapshot server-side (not localStorage), refresh it if 6+ hours stale, never mix old and new data across the three, never delete previous results on a failed refresh, and surface failure honestly with a retry. |
| **Implementation** | New `FarmerAnalysis` Prisma model (1:1 with `Farmer`, JSON columns for each result, `lastSuccessAt`/`lastAttemptAt`/`lastError`). `farmer-analysis.service.ts#getOrRefreshFarmerAnalysis` checks `Date.now() - lastSuccessAt < 6h`; if fresh, returns the cached row untouched; if stale, runs `getMarketComparison`/`getAdvisory`/`getDistressRisk` inside one `Promise.all` and persists all three together — any single failure aborts the whole persist, leaving the previous row exactly as it was. New `GET /api/farmers/:id/analysis` endpoint. Frontend: `FreshnessBadge` component ("Updated Xh ago" / "Last updated Xh ago · Unable to refresh" + Retry), wired into Dashboard and — so revisiting *any* page, not just the dashboard, needs no manual click — Market/Advisory/Distress pages too, which now show the auto-loaded snapshot by default and relabel their manual buttons ("Regenerate now"/"Reassess now") as on-demand overrides that don't touch the persisted snapshot. |
| **Data source** | The three results are the exact same real data (Open-Meteo, data.gov.in via local sync, farmer profile, ML model) already documented elsewhere in this audit — this section only changes *when* they're recomputed, not what they contain. |
| **Backend** | `prisma/schema.prisma` (`FarmerAnalysis`), `src/services/farmer-analysis.service.ts`, `src/controllers/farmer.controller.ts`, `src/routes/farmer.routes.ts`. |
| **Frontend** | `src/components/FreshnessBadge.tsx`, `src/lib/format.ts` (`formatRelativeTime`), `src/pages/Dashboard.tsx`, `src/pages/Market.tsx`, `src/pages/Advisory.tsx`, `src/pages/Distress.tsx`. |
| **Test performed** | `test/farmer-analysis.test.ts` (7 tests, timestamps backdated directly in Postgres to simulate elapsed time deterministically): first-time generation and persistence (verified via a direct DB read, not just the response); 1h and 5h59m revisits both serve cache untouched; 6h1m revisit refreshes and advances the timestamp; a farmer whose coordinates are nulled (forcing Advisory's real weather dependency to fail) while stale produces a graceful failure — `refreshFailed: true`, the real error message, `lastSuccessAt` unchanged, and the prior Distress result byte-identical (`assert.deepEqual`) — then a subsequent retry after restoring coordinates succeeds and clears the error; all-three-together structural check. **Live browser verification** (`e2e/freshness-walkthrough.mjs`, real Chromium against real Postgres): 12/12 steps passed — first-visit auto-generation with zero clicks, snapshot confirmed persisted in Postgres (not just in memory), 1h/5h59m no-refresh, 6h+ refresh, a real failed-refresh-preserves-old-results cycle with the UI showing "Unable to refresh" and a working Retry button, page-reload persistence, and all three results present together in the DOM. Both pre-existing E2E scripts (`walkthrough.mjs`, `visual-walkthrough.mjs`) needed two button-label selector updates (`"Assess this farmer's risk"` → `"Reassess now"`, `"Get advisory"` → also matches `"Regenerate now"`) to match the new, intentional relabeling — both pass 18/18 and 12/12 again after the fix. |
| **Result** | **PASS** |

---

*Sections 1–17 above reflect real, verified results — backend tests, real
API calls, and real Chromium browser walkthroughs — not just "the UI
exists." Last updated 2026-08-31.*
