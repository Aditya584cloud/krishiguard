# KrishiGuard Backend Audit

**Code-level audit · read-only**

A file-by-file inspection of the actual repository — not the intended architecture, the one that exists on disk. Every claim below is traced to a specific file and line, or verified by running the project's own build/typecheck. No code was modified; two diagnostic builds were run and their generated output was deleted afterward.

| | |
|---|---|
| **Repository** | `/home/aditya/krishiguard/backend` |
| **Files inspected** | 30 TypeScript source files, 1 Prisma schema, 3 migrations, 5 config files (≈890 LOC in `src/`) |
| **Detected stack** | Fastify 5, Prisma 7 (pg driver adapter), PostgreSQL, Zod 4, TypeScript 7 (nodenext/ESM), tsx |
| **Excluded** | `node_modules/`, lockfiles, `.agents/skills/**` (vendored Prisma reference docs, not app code) |
| **Version control** | No `.git` directory present — repo is not currently under version control |
| **Verified, not assumed** | `npx tsc --noEmit` was run to confirm compile status; migrations were diffed against `schema.prisma` |

---

## Part 1 — Complete project structure

The tree below is the actual repository, annotated in place. `⚠ RED` = dead/unused code confirmed by grep. `⚠ AMBER` = a real defect confirmed by running the toolchain.

```
prisma/
  schema.prisma                        — 2 models: Farmer, WeatherObservation
  migrations/                          — 3 migrations, verified in sync with schema.prisma
    20260823111934_init/
    20260823124933_add_weather_observation/
    20260824192724_add_farmer_coordinates/
  migration_lock.toml
prisma.config.ts                       [AMBER] fails npx tsc --noEmit (see Part 6)
docker-compose.yml                     — local Postgres 17 for dev only
.env                                   — DATABASE_URL, PORT, NODE_ENV, DATA_GOV_API_KEY (blank)
.gitignore                             — excludes .env, node_modules — but no .git exists yet
package.json                           [AMBER] lists "express" as a dependency; never imported
tsconfig.json                          [AMBER] rootDir/outDir commented out (see Part 17)

src/
  server.ts                            — entry point / bootstrap: calls app.listen()
  app.ts                               — Fastify instance, CORS plugin, /health, route registration
  service.ts                           [RED — DEAD] EMPTY FILE, zero imports found anywhere
  config/
    env.ts                             — reads PORT/NODE_ENV only, no Zod validation
  lib/
    prisma.ts                          — single PrismaClient singleton via @prisma/adapter-pg
  routes/
    farmer.routes.ts                   — 4 endpoints, no Fastify-level schema binding
    weather.routes.ts
    advisory.routes.ts
    distress.routes.ts
    market.routes.ts
  controllers/
    farmer.controller.ts               — safeParse + explicit status codes (correct pattern)
    weather.controller.ts              — safeParse + explicit status codes (correct pattern)
    advisory.controller.ts             [AMBER] parse() + generic catch → always 500
    distress.controller.ts             [AMBER] parse() + generic catch → always 500
    market.controller.ts               [AMBER] parse() + generic catch → always 500
  schemas/                             — 5 Zod schema files, one per domain
    farmer.schema.ts · weather.schema.ts · advisory.schema.ts · distress.schema.ts · market.schema.ts
  services/
    farmer.service.ts                  — farmer CRUD + orchestrates geocoding & weather
    geocoding.service.ts               — Open-Meteo geocoding, isolated, clean
    weather.service.ts                 [AMBER] Open-Meteo forecast + hidden DB write side-effect
    advisory.service.ts                — thin orchestration layer
    advisory.translation.ts            — pure, static multilingual templates
    distress.service.ts                — pure scoring + officer routing lookup
    agri-officer.service.ts.ts         [AMBER] double file extension typo; 3 hardcoded Odisha officers
    market.service.ts                  — data.gov.in mandi integration, gated on API key
  repositories/
    farmer.repository.ts               [RED — DEAD] duplicates farmer.service.ts, never imported
  types/
    weather.ts                         — WeatherData interface

.agents/skills/prisma-*/                — vendored Prisma skill reference docs (not app code, excluded)
```

### What is present, mapped to your checklist

| Role | Location | Notes |
|---|---|---|
| **Entry point** | `src/server.ts` | Calls `app.listen()`, catches startup errors, exits(1) on failure. |
| **Fastify app setup** | `src/app.ts` | Instantiates Fastify with `logger:true`, registers `@fastify/cors`, registers 5 route plugins under `/api`. |
| **Server/bootstrap** | `src/server.ts` | Binds `0.0.0.0:PORT`. |
| **Middleware/plugins/hooks** | `src/app.ts` | Only `@fastify/cors`. **No `setErrorHandler`, no `addHook`, no request/response hooks anywhere in the codebase** — confirmed by grep. |
| **Configuration** | `src/config/env.ts` | Not the single source of truth — `DATABASE_URL` and `DATA_GOV_API_KEY` are read directly via `process.env[...]` in `lib/prisma.ts` and `market.service.ts` instead of going through this file. |
| **Utilities** | — | None exist. No shared HTTP client, no logger wrapper, no formatting helpers. Each external-API service hand-rolls its own `fetch`. |
| **Tests** | — | **None found anywhere in the repository.** No test runner is configured in `package.json`. |
| **Scripts** | `package.json` | `dev` (tsx watch), `build` (tsc), `start` (node dist/server.js). No seed script despite a migrations folder existing. |

---

## Part 2 — Files read, files excluded

Every file under `src/`, `prisma/`, and the root-level config files was opened and read in full — not sampled by filename. The table below is the complete inventory.

| File | Fully read | Why it matters |
|---|---|---|
| All 5 `routes/*.ts` | yes | Confirms route→controller wiring, prefix registration. |
| All 5 `controllers/*.ts` | yes | Where validation-to-HTTP-status mapping happens (or doesn't). |
| All 5 `schemas/*.ts` | yes | The only runtime input validation in the app. |
| All 8 `services/*.ts` | yes | All business logic, all external API calls, all DB writes live here. |
| `repositories/farmer.repository.ts` | yes | Confirmed unused via `grep -rn "farmer.repository" src/` — zero matches outside its own file. |
| `app.ts`, `server.ts`, `service.ts` | yes | `service.ts` is confirmed empty and confirmed unimported. |
| `config/env.ts`, `lib/prisma.ts`, `types/weather.ts` | yes | Config/bootstrap surface. |
| `prisma/schema.prisma` + all 3 migration SQL files | yes | Diffed migrations against schema by hand — no drift. |
| `tsconfig.json`, `package.json`, `prisma.config.ts`, `.env`, `.gitignore`, `docker-compose.yml` | yes | Build/deploy configuration. |
| `.agents/skills/prisma-*/**` (≈65 files) | excluded | Vendored third-party Prisma CLI/API reference documentation bundled with the harness, not project source. Not relevant to this backend's behavior. |
| `package-lock.json`, `skills-lock.json` | excluded | Lockfiles, not source. |

**No relevant backend file was left uninspected.** The one thing not verifiable by reading alone — whether the project actually compiles — was checked by running `npx tsc --noEmit` directly (see Part 6/17 for the result).

---

## Part 3 — API architecture

6 endpoints exist. All are wired end-to-end and reachable. Whether each is *correct*, not just reachable, varies — see the Status column.

| Method | Route | Service / DB / External | Success | Errors | Status |
|---|---|---|---|---|---|
| GET | `/health` | None (inline in `app.ts`) | 200 | — | **working** |
| POST | `/api/farmers` | `farmer.service.createFarmer` → Open-Meteo geocoding → `prisma.farmer.create` | 201 | 400 (bad body, via `safeParse`) · **no try/catch** around the service call → duplicate phone or geocoding failure falls through to Fastify's default handler as an uncaught 500 | **working, fragile** |
| GET | `/api/farmers` | `farmer.service.getFarmers` → `prisma.farmer.findMany()`, unfiltered, unpaginated | 200 | none modeled (none needed — always returns, possibly empty array) | **working** |
| GET | `/api/farmers/:id` | `farmer.service.getFarmerById` → `prisma.farmer.findUnique` | 200 | 404 if not found | **working** |
| GET | `/api/farmers/:id/weather` | `farmer.service.getFarmerWeather` → Open-Meteo forecast + `weatherObservation.create` side-effect write | 200 | 404 (farmer missing) · 502 (any other thrown error, including the data-state case "location not available" — semantically wrong code, see Part 8) | **working, wrong code on one path** |
| POST | `/api/advisory` | `advisory.service.getAdvisory` → farmer+weather lookup → `advisory.translation.generateFarmerAdvisory` (pure) | 200 | **everything → 500**: bad body, farmer-not-found, and weather API failure are indistinguishable to the caller | **working, error codes broken** |
| POST | `/api/distress` | `distress.service.getDistressRisk` → farmer lookup → pure scoring → `agri-officer.service` lookup (in-memory) | 200 | **everything → 500**, same pattern as advisory | **working, error codes broken** |
| POST | `/api/market` | `market.service.getMarketComparison` → farmer lookup → data.gov.in mandi API | 200 | **everything → 500**, same pattern; additionally always throws today because `DATA_GOV_API_KEY` is blank | **blocked (no API key)** |

### Request-flow traces for the important endpoints

**POST /api/farmers** — the only endpoint that writes new farmer state, and the only one with no error boundary of its own:

```
HTTP POST → farmer.routes.ts → createFarmerSchema.safeParse → createFarmerController
  → farmer.service.createFarmer → geocodeLocation() [Open-Meteo] → prisma.farmer.create
  → 201 { success, data }
```

**POST /api/distress** — illustrates the biggest gap between the stated feature and the code: the score never touches live weather or market data.

```
HTTP POST { farmerId, rainfallDeviationPercent, priceChangePercent, loanDueInDays }
  → distressSchema.parse → getFarmerById → pure weighted scoring on the 3 caller-supplied numbers
  → if HIGH: findAgriOfficer (in-memory) → 200 { riskScore, riskLevel, reasons, alert }
```

Note what's *not* in this chain: no call to `weather.service`, no call to `market.service`. The three risk inputs are trusted client input, not derived from anything the backend already knows about the farmer.

---

## Part 4 — Database / Prisma audit

Two models exist: `Farmer` and `WeatherObservation`. Migrations are in sync with the schema — verified by reading all 3 SQL files against `schema.prisma` line by line.

### Farmer

**[GOOD] Core fields are correctly typed and constrained** — `prisma/schema.prisma:9-21`
`id` (uuid PK), `phone` (unique — correctly prevents duplicate registration at the DB layer), `createdAt`/`updatedAt` are all sound, ordinary choices for this entity.

**[WARN] `language` is an unconstrained string, but only 3 values are ever usable** — `schema.prisma:13` vs `advisory.translation.ts:1`
The DB and the Zod schema both accept any string ≥2 characters for `language`. But `advisory.translation.ts` privately types `AdvisoryLanguage = "English" | "Odia" | "Hindi"` and silently falls back to English for anything else (`advisoryMessages[language as AdvisoryLanguage] ?? advisoryMessages.English`). A farmer registered with `"Odiya"` (a plausible typo) or `"odia"` (wrong case) gets English advisory forever, with no error and no indication in the response that a fallback occurred.

**[INFO] `latitude`/`longitude` nullability is unreachable via the public API** — `schema.prisma:17-18` · `farmer.service.ts:6-11`
`createFarmer` always awaits geocoding before insert and throws if it fails, so a farmer created through `POST /api/farmers` today can never end up with null coordinates. The nullability exists because the columns were added in a later migration than the table itself — it's a real column state, just not one the current code path produces. `getFarmerWeather` still defensively checks for it (`farmer.service.ts:31`), which is correct given the schema allows it.

### WeatherObservation

**[WARN] Write-only table — inserted on every weather fetch, read by nothing** — `weather.service.ts:70-93`
Confirmed by grep: `weatherObservation` appears in exactly one file, and every occurrence is a write. No `findMany`/`findFirst`/`findUnique` against this model exists anywhere in the codebase. The two indexes on `(latitude, longitude)` and `(observedAt)` are consequently indexes on a table nothing queries yet — harmless, but presently pointless. Not a schema defect (the shape is reasonable if a "weather history" feature is coming), just an incomplete feature: the write half exists, the read half doesn't.

**[INFO] No relation back to Farmer** — `schema.prisma:22-42`
Rows aren't tied to which farmer triggered them — only raw lat/lon. If a per-farmer weather history is ever built on top of this table, a `farmerId` foreign key would be needed; today, with no read path, this isn't a blocker.

### Sufficiency for the stated feature set

The schema is sufficient for what's actually implemented (farmer CRUD, weather logging). It is **not** sufficient for what the distress-scoring feature implies it does: there is no model that stores rainfall history, price history, or a prior distress score per farmer. That's not a missing-migration problem — it's a missing-pipeline problem (see Part 11). Per your instruction not to recommend schema changes merely because they're theoretically possible: I'm not recommending a `DistressScore` or `MarketPrice` table as a fix here, because the more fundamental gap is that nothing currently computes those inputs from real data at all — adding tables to store numbers that are still hand-supplied wouldn't close the gap. This is flagged for team awareness, not as a P0/P1 code change.

**N+1 risk:** none. Every Prisma call in the codebase is a single `findUnique`/`findMany`/`create`; nothing loops over records issuing per-row queries.

---

## Part 5 — Service architecture

| Service | Responsibility | Assessment |
|---|---|---|
| **farmer.service.ts** | CRUD + orchestrates geocoding on create, weather-for-farmer | Reasonable for this scale. Its sibling `repositories/farmer.repository.ts` re-implements the exact same three Prisma calls (`create`, `findMany`, `findUnique`) and is **never imported anywhere** — an abandoned half-migration to a repository pattern, now pure duplication. |
| **geocoding.service.ts** | Village → lat/lon via Open-Meteo | Clean, single-purpose, properly isolated. Only weakness: it searches by `village` name alone and always takes `results[0]`, ignoring the `district`/`state` it receives as parameters — no disambiguation between same-named villages in different states. |
| **weather.service.ts** | Fetch current weather from Open-Meteo | Does two unrelated things: fetches weather *and* unconditionally writes a `WeatherObservation` row as a side effect (line 70-93), using `(prisma as any).weatherObservation`. Every caller of `getCurrentWeather` — including every advisory request — incurs a DB write it didn't ask for and that nothing reads back. |
| **advisory.service.ts** | Orchestrate farmer+weather lookup → advisory text | Thin, appropriately scoped, correct layer. |
| **advisory.translation.ts** | Static multilingual message templates keyed by weather thresholds | Pure function, zero I/O, deterministic. The cleanest file in the codebase. "Translation" is a slight misnomer — it's canned per-language copy, not dynamic translation — but that's an accurate and appropriate implementation for a hackathon. |
| **distress.service.ts** | Weighted scoring + officer routing trigger | Pure, deterministic, explainable (see Part 11). Its one dependency on live data is `getFarmerById`; the numeric inputs driving the score are 100% caller-supplied, so this service does not integrate with `weather.service` or `market.service` despite the naming implying it should. |
| **agri-officer.service.ts.ts** | Static lookup of 3 hardcoded Odisha officers | Correctly implemented exactly as the project brief describes ("simulated/sample district-level data"). File name has a genuine duplicate-extension typo (`.ts.ts`) — cosmetic, but it compiles to `agri-officer.service.ts.js`, confirmed by an actual build run. |
| **market.service.ts** | data.gov.in mandi price fetch + comparison | Correctly gated on `DATA_GOV_API_KEY` presence, fails with a clear message when absent. Structurally near-identical to `weather.service.ts` and `geocoding.service.ts` (manual `fetch` + `response.ok` check + manual JSON cast) — three independent copies of the same integration pattern, no shared helper. |

**Coupling:** one-directional and shallow — `advisory`/`distress`/`market` → `farmer` → `geocoding`/`weather`. No circular imports, no controller imports another controller. This is appropriate for the codebase's size.

---

## Part 6 — Validation / TypeScript audit

Verified by actually running `npx tsc --noEmit` against the repository, not by inspection alone.

**[CRIT] The project does not currently compile** — `prisma.config.ts:11`
`npx tsc --noEmit` produces exactly one error: `TS2375`. `tsconfig.json` sets `exactOptionalPropertyTypes: true`; `prisma.config.ts` assigns `datasource: { url: process.env["DATABASE_URL"] }`, whose type is `string | undefined`, to a property typed `url?: string` — which under this flag rejects an explicit `undefined` value. This is a real, reproducible compile failure, not a style warning; `npm run build` exits non-zero today.

**[CRIT] Unsafe `any` cast around a fully-typed model** — `weather.service.ts:70`
`const weatherObservationModel = (prisma as any).weatherObservation;` followed by `if (weatherObservationModel?.create)`. The model is present in `schema.prisma` and its migration is applied — the generated Prisma client has a fully-typed `prisma.weatherObservation` property. This cast defeats that typing and silently no-ops if the property were ever missing, with no log and no thrown error. It is the only `any` in the entire codebase — everywhere else, types are respected.

**[WARN] Inconsistent Zod-to-HTTP mapping across controllers** — `farmer.controller.ts, weather.controller.ts` vs `advisory/distress/market.controller.ts`
`createFarmerController` and `getWeather` use `schema.safeParse()` and return a clean 400 on failure. `advisoryController`, `distressController`, and `marketController` use `schema.parse()` (which throws) inside a generic `try/catch` that maps *every* thrown error — including the resulting `ZodError` — to a 500. Same validation library, two different outcomes depending on which controller you hit.

**[INFO] DB/API type gap on `language`** — `farmer.schema.ts:7` vs `advisory.translation.ts:1`
Already covered in Part 4 from the schema side — from the TypeScript side, this means nothing at compile time or validation time guarantees `farmer.language` is a value the advisory templates actually support. It type-checks cleanly (both sides are plain `string`), but the two files' notions of "language" are silently disconnected.

**[GOOD] Otherwise, the codebase is disciplined**
Zero non-null assertions (`!`) anywhere. `noUncheckedIndexedAccess` is honored correctly — e.g. `market.service.ts:70-80` explicitly checks `sortedByPrice[0]` and the last element for `undefined` before use, rather than asserting. Aside from the one `weatherObservation` cast, there is no other `any` in the project.

**[NEUTRAL] Three separate places read environment variables three separate ways** — `config/env.ts` · `lib/prisma.ts:5` · `market.service.ts:25`
`PORT`/`NODE_ENV` go through `config/env.ts` (untyped, no Zod validation despite Zod being used everywhere else for input). `DATABASE_URL` is read directly in `lib/prisma.ts`. `DATA_GOV_API_KEY` is read directly in `market.service.ts`. No single source of truth for configuration.

---

## Part 7 — External API integrations

| Integration | Provider | Auth | Timeout | Malformed-response handling | Status |
|---|---|---|---|---|---|
| **Weather** | Open-Meteo forecast API (`weather.service.ts:21`) | None required | None (bare `fetch`, no `AbortSignal`) | None — `data.current.temperature_2m` etc. accessed without checking `data.current` exists; a shape change throws an unhandled `TypeError` | **implemented** |
| **Geocoding** | Open-Meteo geocoding API (`geocoding.service.ts:13`) | None required | None | Checks for an empty `results` array (good), but does not validate individual result fields | **implemented** |
| **Mandi / market** | data.gov.in resource API (`market.service.ts:5`) | `DATA_GOV_API_KEY` query param | None | Numeric fields (`min_price`/`max_price`/`modal_price`) are `Number(...)`-cast with no `isNaN` guard — a non-numeric upstream value silently becomes `NaN` in the response | **blocked — key not set** |

**[CRIT] Market integration: code complete, credential absent — these are two different things** — `.env:16` · `market.service.ts:25-29`
**Implemented:** URL construction, state/district/commodity filters, response remapping into a clean internal shape, high/low/average price comparison math — all present and structurally sound. **Blocked:** `.env` has `DATA_GOV_API_KEY = ` (empty). The service correctly fails fast with `"DATA_GOV_API_KEY is not configured"` rather than sending an unauthenticated request. **Not implemented:** nothing — this is the one feature in the whole codebase that is fully written but externally blocked, exactly as your project context states.

**[WARN] No request timeout on any of the three external calls**
None of `geocoding.service.ts`, `weather.service.ts`, or `market.service.ts` passes an `AbortSignal` to `fetch`. A stalled upstream connection hangs the request indefinitely — there is no server-side guard against it anywhere in the stack.

**[GOOD] Response-shape discipline is consistently good**
Despite the missing validation above, all three integrations remap external JSON into clean internal types (`WeatherData`, the geocoding lat/lon pair, the market `prices`/`comparison` shape) before it ever reaches a controller. Raw provider field names (`temperature_2m`, `modal_price`, etc.) never leak into an API response. `fetch(` appears in exactly these 3 files and nowhere else in the codebase — no controller or route ever calls an external API directly.

No rate-limit handling exists for any provider — not flagged as a defect given Open-Meteo's free tier and data.gov.in's typical hackathon-scale quota; would only matter under sustained load this project isn't expected to see.

---

## Part 8 — Error handling

There is no global Fastify error handler (`setErrorHandler` is never called). Every response code the API returns is produced by hand inside a controller, or falls through to Fastify's built-in default handler when a controller has no `try/catch` at all.

**[CRIT] `createFarmerController` has no error boundary** — `farmer.controller.ts:15`
`const farmer = await createFarmer(result.data);` is not wrapped in try/catch. A duplicate phone number (Prisma `P2002` unique-constraint violation — genuinely likely during a demo, since phone is the unique key) or a geocoding failure both fall through uncaught to Fastify's default error handler, which returns a raw 500 with the driver/thrown error's message. Should be 409/400 (duplicate phone) or 400/422 (unresolvable location) — both are client-input problems, not server failures.

**[CRIT] Advisory / distress / market: every error becomes a 500** — `advisory.controller.ts:14-19` · `distress.controller.ts:16-21` · `market.controller.ts:16-21`
All three share this exact pattern:

```ts
catch (error) {
  return reply.status(500).send({
    success: false,
    error: error instanceof Error ? error.message : "Internal Server Error",
  });
}
```

This collapses three semantically distinct failure classes into one status code:
- A malformed request body (`ZodError` from `.parse()`) — should be **400**.
- `"Farmer not found"` (thrown as a plain `Error` in all three services) — should be **404**.
- A genuine upstream failure (weather/market API down) — arguably **502/503**, currently indistinguishable from the above two.

**[WARN] 502 used for a data-state problem, not an upstream failure** — `farmer.controller.ts:65` · `farmer.service.ts:32`
`getFarmerWeatherController`'s catch-all maps everything to 502, including `"Farmer location is not available"` — a case where the farmer record itself has no coordinates, which is a data/state issue, not a bad gateway. 502 is the correct code for an actual Open-Meteo failure reached through the same catch block, but wrong for this one.

**[INFO] Market's "no prices found" case is a legitimate empty result, not a server error** — `market.service.ts:53-57`
`if (records.length === 0) throw new Error(...)` — an empty result set from a real, successful upstream query is treated the same as a crash, and surfaces as 500 via the controller's catch-all. This is a normal "no data for this crop/district combination" case and reads better as a 404 or a 200 with an empty payload.

**Not found:** duplicated error responses (no controller ever calls `reply.send` twice), or errors being swallowed silently — except the optional-chained `weatherObservationModel?.create` in `weather.service.ts`, which would silently no-op with zero signal if the property were ever absent (currently unreachable since the model exists, but worth noting as the one place a failure could vanish without a trace).

---

## Part 9 — Security

Scoped to what's actually exploitable or genuinely risky in this codebase — not a generic enterprise checklist.

**[GOOD] No SQL injection surface**
Every database operation goes through Prisma's typed query builder (`findUnique`, `findMany`, `create`). Zero occurrences of `$queryRaw` or `$executeRaw` anywhere in the codebase. This is genuinely safe.

**[GOOD] No SSRF surface**
All three external calls hit fixed, hardcoded hostnames (`open-meteo.com`, `api.data.gov.in`). User input only ever populates query-string values, never the request host.

**[WARN] Every endpoint is unauthenticated — `GET /api/farmers` is an open PII dump** — `farmer.controller.ts:23-30`
There is no authentication or authorization anywhere in the codebase. Any client can list every registered farmer — name, phone number, village/district/state, coordinates — with a single unauthenticated GET, and can query distress risk or market data for any `farmerId` it can guess or enumerate. For a hackathon demo with synthetic data this is commonly acceptable; it is called out explicitly because phone numbers and locations are real PII the moment real farmer data is entered.

**[INFO] Secrets hygiene is fine as-is** — `.env` · `.gitignore:3`
`.env` is correctly excluded via `.gitignore`. The only credential present, `DATA_GOV_API_KEY`, is currently blank. The Postgres credentials in `docker-compose.yml` are local-dev-only defaults, not sensitive. The repository has no `.git` directory yet, so nothing has been committed anywhere — worth a conscious check before the first `git init` + push that `.env` stays out.

**[INFO] Phone number: length-checked, not format-checked** — `farmer.schema.ts:5`
`z.string().min(10).max(15)` accepts any characters, not just digits — a value like `"abcdefghij"` passes validation. Low severity (self-reported data, no injection risk since Prisma parameterizes it regardless), but worth knowing before trusting this field for anything like an SMS integration later.

**CORS** (`origin: true`, reflects any origin) is permissive but appropriate for a hackathon frontend that isn't finalized yet — not flagged as a fix-now item. **Error message leakage** (Part 8) is a mild information-disclosure concern in a public deployment, but is actually useful during a live demo; call it out, don't fix it under deadline pressure.

---

## Part 10 — Reliability — realistic failure scenarios

| Scenario | Current behavior |
|---|---|
| **Database unavailable** | Uncaught in `createFarmerController` → default Fastify 500. Caught in `getFarmerWeatherController` → 502 (wrong code, but at least handled). Other controllers → falls into the generic catch-all → 500. |
| **Weather API down / non-200** | Throws inside `getCurrentWeather`; surfaces as 502 via the weather controller, or as 500 via advisory/distress's generic catch-all. |
| **Weather API returns malformed JSON (missing `current`)** | Unhandled `TypeError` reading `data.current.temperature_2m` — bubbles up the same way as an outright API failure, with a less useful error message. |
| **Geocoding fails during farmer creation** | Throws inside `createFarmer`; **uncaught** in the controller → process does not crash (Fastify's own layer catches it) but the client only sees a raw 500. |
| **Farmer does not exist** | Handled consistently at the data-lookup layer everywhere (explicit null checks or a thrown `"Farmer not found"`), but surfaces as 404 only for the two GET-style endpoints — the three POST endpoints turn it into a 500 via their generic catch (Part 8). |
| **Officer does not exist for a district** | **Handled well** — returns `{ status: "NO_OFFICER_FOUND" }` inside a normal 200 response. No error, no crash. |
| **External API times out** | No timeout is configured anywhere; the request simply hangs until the network layer itself gives up. No graceful behavior exists for this today. |
| **`DATABASE_URL` missing** | **Fails fast, correctly** — `lib/prisma.ts:7-9` throws synchronously at module load, so the server refuses to start with a clear message rather than failing mysteriously later. |
| **`PORT`/`NODE_ENV` missing** | Silently defaults to `8000`/`"development"` — acceptable. |
| **`DATA_GOV_API_KEY` missing (current state)** | Each market request fails individually with a clear message; the rest of the server stays healthy. Appropriate given market is explicitly a scaffolded, optional feature. |
| **Invalid request body** | Clean 400 with field-level detail on `/api/farmers` and `GET /api/weather` (via `.flatten()`). A raw, un-flattened 500 on `/api/advisory`, `/api/distress`, `/api/market` — much worse developer experience for the exact same category of mistake. |

---

## Part 11 — Business logic audit

### Advisory (`advisory.translation.ts`)

**[GOOD] Thresholds are simple, deterministic, and non-overclaiming**
rain > 10mm → heavy-rain warning · temp > 35°C → heat-stress warning · humidity > 80% → fungal-risk warning · none of the above → a generic "conditions are normal" message. Multiple conditions can co-fire correctly (a hot, humid day returns two recommendations). The English/Hindi/Odia copy is appropriately hedged ("check for signs of," "irrigate when necessary") rather than making confident diagnostic claims — a genuine strength for a hackathon prototype.

**[WARN] "Expected" rainfall copy describes forecast data the backend never fetches** — `advisory.translation.ts:20-21`
The heavy-rain message says *"Heavy rainfall is **expected**"*, but the trigger is `weather.rainMm` — Open-Meteo's **current** observation, not a forecast. `weather.service.ts` only requests the `current` block, never `hourly`/`daily`. The copy implies predictive capability the integration doesn't have.

**[WARN] `soil` is required by the schema and never used** — `advisory.schema.ts:6` · `advisory.service.ts` (entire file)
`advisorySchema` requires a `soil` field (min 2 chars) on every request. It is validated, accepted, and then never referenced anywhere in `advisory.service.ts` or `advisory.translation.ts` — a required input that has zero effect on the response.

**[INFO] `crop` only ever appears as interpolated text, never as logic**
Thresholds are identical regardless of crop. "Crop-specific advisory" today means the crop's name is spliced into an otherwise generic message — accurately described as crop-name-aware, not crop-logic-aware. Reasonable for a hackathon; just don't oversell it as agronomic differentiation in a demo narrative.

### Distress (`distress.service.ts`)

**[GOOD] The scoring formula itself is internally consistent and explainable**
Rainfall deviation (±35/±25), price change (−35/−20, two-tier with no double-counting via `else if`), loan due date (30/15) — each category is mutually exclusive within itself and additive across categories. Maximum attainable raw score is exactly 100 by construction; the explicit `Math.min(score, 100)` clamp is technically redundant today but is good defensive practice if weights change later. Thresholds (HIGH ≥60, MEDIUM ≥30) are simple, deterministic round numbers. The `reasons` array is generated from the exact same branches that produced the score — no mismatch between the explanation and the number.

**[CRIT] The score never touches the farmer's real data** — `distress.schema.ts:5-7` · `distress.service.ts:7-13`
This is the single largest gap between what the project context describes ("farmer distress-risk scoring") and what the code does. `rainfallDeviationPercent`, `priceChangePercent`, and `loanDueInDays` are plain numbers in the POST body — the caller supplies them directly. `getFarmerById` is called only to look up the farmer's name/village/district for the response and for officer routing; it is never used to compute deviation from `WeatherObservation` history, and `market.service` is never called to compute a real price change. Today, `POST /api/distress` is a standalone risk calculator that happens to be labeled with a `farmerId` — not an automatic pipeline from real conditions to a risk score. This should be understood clearly by the team before a demo claims otherwise.

**[GOOD] Officer routing is correctly scoped to what the project describes** — `agri-officer.service.ts.ts:9-38`
Only fires on HIGH risk (not MEDIUM) — a defensible, explainable cutoff matching "route *high-risk* farmers." Matching is an exact, case-insensitive district+state comparison against 3 hardcoded Odisha officers — correctly implemented as "simulated/sample district-level data," exactly as the project brief states. Any farmer outside those 3 exact districts (Balasore, Khordha, Cuttack) gets `NO_OFFICER_FOUND` even at HIGH risk — expected given the sample dataset's size, not a bug.

---

## Part 12 — Testing

**No tests exist.** `find . -iname "*test*" -o -iname "*spec*"` (excluding `node_modules`) returns nothing. `package.json` has no `test` script and no test-runner dependency (no vitest, jest, or `node:test` usage anywhere).

Minimum high-value additions — deliberately small, targeting deterministic logic only:

| Target | Why it's worth the cost |
|---|---|
| `distress.service.getDistressRisk` | Pure scoring with a real bug surface (band boundaries at exactly 30 and 60, officer routing firing only at HIGH, `NO_OFFICER_FOUND` path). No I/O needed beyond stubbing `getFarmerById`. |
| `advisory.translation.generateFarmerAdvisory` | Pure, zero I/O. Test each threshold boundary, the multi-condition case, and the unknown-language fallback to English — this is exactly where the silent fallback found in Part 4/6 would show up in a test. |
| `agri-officer.service.findAgriOfficer` | Trivial but cheap: case-insensitivity, no-match case. |
| Zod schema boundary values | `createFarmerSchema`/`distressSchema`/`advisorySchema` are the app's only real input gate — worth locking in the boundary behavior (phone length 10 vs 15, min-length strings) with a few assertions. |

Not recommended: integration tests against a live database, e2e tests through Fastify's HTTP layer, or tests for the external API integrations — disproportionate cost for a hackathon deadline, and the logic worth protecting is entirely in the four pure/near-pure targets above.

---

## Part 13 — Observability / debugging

**[GOOD] Baseline request logging is present** — `app.ts:10`
`Fastify({logger: true})` gives automatic pino-based method/URL/status/response-time logging for every request — a reasonable floor for a demo.

**[WARN] 3 of 5 POST controllers log nothing on failure** — `advisory.controller.ts` · `distress.controller.ts` · `market.controller.ts`
Only `farmer.controller.ts` (`getFarmerWeatherController`) and `weather.controller.ts` call `console.error` in their catch blocks. Advisory, distress, and market have no logging at all on failure — if one of these breaks during a live demo, the only signal is the JSON error response the frontend receives; nothing appears in the server's own logs to help diagnose it in the moment.

**[GOOD] No accidental secret logging**
Nowhere does the code explicitly log `DATA_GOV_API_KEY`, `DATABASE_URL`, or farmer phone numbers. Fastify's default request logging captures method/URL/status, not full request bodies.

**Sufficient for a hackathon demo?** Partially. Request-level visibility is fine; failure-level visibility has a real, easily-noticed gap in exactly the three endpoints most likely to be exercised live (advisory, distress, market).

---

## Part 14 — Performance

**[WARN] A DB write is added to the hot path of every weather-touching request, for a table nothing reads** — `weather.service.ts:70-93`
This isn't premature-optimization theorizing — it's a verifiable, provable extra round-trip: every call to `getCurrentWeather` (directly via `GET /api/farmers/:id/weather`, and indirectly via `POST /api/advisory`) `await`s a `weatherObservation.create` whose result is confirmed (Part 4) to never be queried back anywhere in the codebase.

**[INFO] `GET /api/farmers` has no pagination** — `farmer.service.ts:14-16`
`findMany()` with no arguments returns the entire table on every call. Fine at hackathon scale (tens of farmers); would only become a real problem past hundreds/thousands of rows — not urgent.

**[GOOD] No N+1 patterns, no missed parallelization**
Every Prisma call is a single-record operation, never inside a loop. Every place that makes two sequential async calls (geocode-then-create, farmer-lookup-then-weather-fetch) is *correctly* sequential — the second call depends on the first's result — not a missed opportunity to run them concurrently.

---

## Part 15 — Architecture quality

| Boundary | Verdict | Why |
|---|---|---|
| **Route → controller boundary** | GOOD | All 5 route files are one-liners registering a controller per method+path. No logic ever leaks into a route file. |
| **Controller layer** | NEEDS IMPROVEMENT | Validation-to-status-code handling is a real, fixable inconsistency: 2 of 5 controllers do it correctly, 3 collapse everything to 500 (Part 8). |
| **Service layer** | NEEDS IMPROVEMENT | Half the services (geocoding, agri-officer, advisory.translation) are genuinely clean and isolated. The other half carry real issues: dead repository duplication, a hidden DB-write side effect in the weather service. |
| **Database boundary** | GOOD | A single Prisma client singleton (`lib/prisma.ts`), correctly imported everywhere, no per-request client creation. Only caveat: one table's read path doesn't exist yet. |
| **External API boundary** | GOOD | `fetch(` occurs in exactly 3 service files and nowhere else — verified by grep. Every integration remaps external shapes into clean internal types before they reach a controller. |
| **Extensibility** | NEEDS IMPROVEMENT | Adding a 4th language requires editing 3 unsynchronized places by hand (the Zod schema, the `AdvisoryLanguage` union, the `advisoryMessages` object) with no compiler or validator tying them together. |

**Coupling** is low and appropriate — one-directional service dependencies, no circular imports. **Readability** is generally good; the main drag on maintainability is inconsistency (two different error-handling patterns, three different env-var access patterns) rather than any single hard-to-read file.

---

## Part 16 — Frontend contract

What a frontend can actually rely on today, grounded in the exact response construction in each service — not idealized shapes.

### POST /api/farmers

```
→ { "name": "Ramesh Nayak", "phone": "9876500001", "language": "Odia",
    "district": "Balasore", "state": "Odisha", "village": "Remuna" }

← 201 { "success": true, "data": { "id": "...", "name": "...", "phone": "...",
        "language": "...", "district": "...", "state": "...", "village": "...",
        "latitude": 21.49, "longitude": 87.03,
        "createdAt": "...", "updatedAt": "..." } }

← 400 { "error": "Invalid farmer data", "details": { ... } }   ⚠ note: NO "success" key here,
                                                                  unlike every other error response below.
```

### GET /api/farmers/:id/weather

```
← 200 { "success": true, "data": { "farmer": { ...full farmer row... },
        "weather": { "latitude", "longitude", "temperatureC", "apparentTemperatureC",
                     "humidityPercent", "precipitationMm", "rainMm",
                     "windSpeedKmh", "weatherCode", "observedAt" } } }
← 404 { "success": false, "error": "Farmer not found" }
← 502 { "success": false, "error": "Unable to fetch farmer weather" }   ⚠ also returned for the
                                                                          "no coordinates" case
```

### POST /api/distress

```
→ { "farmerId": "...", "rainfallDeviationPercent": -35, "priceChangePercent": -25,
    "loanDueInDays": 5 }

← 200 { "success": true, "data": {
    "farmer": { "id", "name", "village", "district" },
    "riskScore": 100, "riskLevel": "HIGH",
    "reasons": [ "Rainfall is significantly below normal.",
                 "Crop market price has fallen significantly.",
                 "Loan repayment is due within one week." ],
    "alert": { "status": "ROUTED", "officer": { "id", "name", "phone", "district", "state" } }
    // alert is null unless riskLevel === "HIGH"; officer is undefined → NO_OFFICER_FOUND status
} }
← 500 for a bad body, a missing farmer, OR a scoring crash — indistinguishable to the caller
```

### Cross-endpoint consistency check

| Convention | Held everywhere? |
|---|---|
| Success envelope `{ success: true, data }` | yes, consistent |
| Error envelope includes `success: false` | no — `createFarmerController`'s 400 response omits it (`farmer.controller.ts:9-12`) |
| 404 used for "resource not found" | only on the two GET endpoints; the three POST endpoints return 500 for the same condition |
| `/health` follows the same envelope | no — different shape by design (`{status, service}`), reasonable for a health check but the frontend shouldn't assume the envelope is universal |

**Nullable fields a frontend must handle:** `Farmer.latitude`/`longitude` (nullable in the schema, though unreachable via the public create flow); `distress.alert` (null unless HIGH risk); `distress.alert.officer` (absent when `status` is `NO_OFFICER_FOUND`).

---

## Part 17 — Deployment readiness

**[CRIT] The documented build/start path cannot work today — verified by actually running it** — `tsconfig.json:5-6` · `prisma.config.ts:11` · `package.json:9-10`

Two independent, compounding failures:

1. `npm run build` (`tsc`) exits with a real compile error — the `exactOptionalPropertyTypes` conflict in `prisma.config.ts` (Part 6). `tsc`'s default behavior is to still emit output despite this error (no `noEmitOnError` is set), so the failure is easy to miss if you only glance at file output rather than the exit code.
2. `tsconfig.json` has `rootDir`/`outDir` both commented out. Running the compiler confirms the consequence directly: it emits `.js`/`.d.ts` files scattered next to every source file (`prisma.config.js` at the repo root, `src/app.js` beside `src/app.ts`, etc.) instead of into a `dist/` folder. **`dist/` is never produced**, so `npm start` (`node dist/server.js`) fails with a module-not-found error every time, on any machine, regardless of the first issue.

`npm run dev` (`tsx watch src/server.ts`) works fine and masks both problems, because `tsx` transpiles directly without honoring `outDir` or performing a separate type-check pass. That's exactly why this hasn't been noticed yet — local development looks completely healthy.

**[WARN] Prisma generation/migration isn't wired into any script** — `package.json:7-11`
No script runs `prisma generate` or `prisma migrate deploy`. A fresh clone + `npm install` + `npm start` on a deploy target has no automated step ensuring the Prisma client is generated or the database is migrated — someone has to remember to do it by hand.

**[INFO] No committed `.env.example`**
`.env` is (correctly) gitignored, but there is no template listing the required variables (`DATABASE_URL`, `PORT`, `NODE_ENV`, `DATA_GOV_API_KEY`). Anyone else setting this up has to reverse-engineer the list from source.

**[GOOD] What's already correct**
Port binding uses `host: "0.0.0.0"` (correct for any containerized/PaaS target, not just localhost). Migrations are verified in sync with the schema. CORS is open by design, which is fine for a not-yet-finalized frontend. `docker-compose.yml` correctly scopes itself to local Postgres for development only, with no assumption baked in about the production database target.

---

## Part 18 — Final verdict

### MUST FIX BEFORE SUBMISSION

- **Build is broken.** `npm run build` fails to type-check, and even if that's ignored, `outDir`/`rootDir` are unset so `dist/` is never produced — `npm start` cannot work as configured.
- **Advisory/distress/market return 500 for validation errors and "farmer not found."** A demo hitting a wrong `farmerId` will look like the server crashed.
- **`createFarmerController` has no try/catch.** A duplicate phone number — realistic during any repeated demo — throws an unhandled 500 instead of a clean, expected error.

### SHOULD FIX IF TIME ALLOWS

- `Farmer.language` isn't validated against the 3 supported languages at registration — silent fallback to English with no signal.
- Drop the `(prisma as any).weatherObservation` cast now that the model is confirmed present and typed.
- Add logging in the advisory/distress/market catch blocks — currently invisible on failure server-side.
- Add a `.env.example`.
- Delete the unused `farmer.repository.ts`, empty `src/service.ts`, and unused `express`/`@types/express` dependency.
- Fix the `createFarmerController` 400 response missing `success: false` — the one inconsistent error shape in the API.

### SAFE TO LEAVE AS-IS

- No authentication on any endpoint — acceptable for a hackathon demo.
- No pagination on `GET /api/farmers` at current/expected data volume.
- No request timeouts on external calls.
- Market blocked on a missing API key — this is expected, not broken.
- Wide-open CORS (`origin: true`).
- No test suite beyond the 4 small targets named in Part 12.

### DO NOT TOUCH

- `geocoding.service.ts` logic, `advisory.translation.ts`, `distress.service.ts`'s scoring formula — clean, deterministic, correctly scoped for a hackathon prototype.
- `agri-officer.service.ts.ts`'s in-memory routing logic (only its filename is a problem, not its behavior).
- Prisma schema and migrations — in sync, correctly modeled for current scope.
- `lib/prisma.ts` singleton pattern.
- All 5 route files and the `/health` endpoint.

**One thing that belongs in neither column above because it isn't a code defect:** distress scoring takes its three inputs directly from the caller rather than deriving them from stored weather or market data (Part 11). This is a scope/roadmap fact the team should be explicit about in a demo narrative, not a bug to patch under deadline pressure.

---

## Part 19 — Exact change plan

Conceptual only — no code is prescribed, per your instructions.

### P0 — must fix

**P0 · `prisma.config.ts` · `tsconfig.json`**
- Problem: Build fails to type-check (verified via `npx tsc --noEmit`: `TS2375`).
- Reason: `exactOptionalPropertyTypes: true` rejects assigning `string | undefined` to the optional `datasource.url?: string`.
- Change: Restructure the `datasource` object so `url` is only included when defined, or scope `exactOptionalPropertyTypes` away from this file — a config-file-only fix.
- Risk: Low — isolated to `prisma.config.ts`, doesn't touch any runtime app code.

**P0 · `tsconfig.json`**
- Problem: Compiled output isn't written to `dist/` — verified experimentally by running `tsc` and observing files land next to source instead.
- Reason: `rootDir`/`outDir` are commented out.
- Change: Set `rootDir: "./src"` and `outDir: "./dist"`; decide whether `prisma.config.ts` (which lives outside `src/`) should be excluded from this build entirely since it's Prisma-only config, not app code.
- Risk: Low — should verify the NodeNext `.js`-suffixed import style (already used consistently throughout) still resolves post-build.

**P0 · `advisory.controller.ts` · `distress.controller.ts` · `market.controller.ts`**
- Problem: A generic catch-all always returns 500, regardless of whether the failure was a bad request, a missing farmer, or a real upstream error.
- Reason: Confirmed by reading every catch block; the correct pattern already exists two files over (`farmer.controller.ts`, `weather.controller.ts`).
- Change: Branch the catch block: a `ZodError` → 400, the `"Farmer not found"` message → 404, anything else → 500/502, mirroring the pattern already used elsewhere in the same codebase.
- Risk: Low — additive branching only, doesn't touch any success-path behavior.

**P0 · `farmer.controller.ts`**
- Problem: `createFarmerController` has no try/catch around the service call.
- Reason: A duplicate phone (Prisma `P2002`) or a geocoding failure currently falls through uncaught to Fastify's default 500 handler.
- Change: Wrap the call in try/catch; map the unique-constraint case to 409/400 ("phone already registered") and the geocoding failure to 400/422 ("could not resolve the given village/district/state").
- Risk: Low — additive only.

### P1 — important

**P1 · `farmer.schema.ts` · `advisory.translation.ts`**
- Problem: `Farmer.language` accepts any string ≥2 chars, but only 3 values are usable downstream; mismatches silently render English.
- Change: Constrain the Zod schema to the same union already hardcoded in `advisory.translation.ts`, so an unsupported language is rejected at registration (400) instead of silently degraded later.
- Risk: Medium — would reject any existing farmer records with an out-of-set language string; confirm none exist first (likely true, project is pre-launch).

**P1 · `weather.service.ts`**
- Problem: `(prisma as any).weatherObservation` bypasses full Prisma typing and silently no-ops via optional chaining if the property were ever absent.
- Change: Use the typed `prisma.weatherObservation.create(...)` directly — the model is confirmed present in schema and migrations.
- Risk: Very low — identical runtime behavior when the model exists, which it does today.

**P1 · `advisory.controller.ts` · `distress.controller.ts` · `market.controller.ts`**
- Problem: Zero logging in these three catch blocks — a live failure is invisible server-side.
- Change: Add a `console.error` in each catch block, matching the pattern already used in `weather.controller.ts`/`farmer.controller.ts`.
- Risk: None — logging only.

**P1 · new: `.env.example`**
- Problem: No committed template for required env vars.
- Change: Add a template listing `DATABASE_URL`, `PORT`, `NODE_ENV`, `DATA_GOV_API_KEY` with placeholder values.
- Risk: None.

**P1 · `farmer.controller.ts`**
- Problem: The 400 response from `createFarmerController` omits `success: false`, unlike every other error response in the API.
- Change: Add `success: false` to that response body for consistency with the rest of the API.
- Risk: None — no frontend integration exists yet to break.

### P2 — optional

**P2 · `repositories/farmer.repository.ts`**
- Problem: Fully unused — confirmed zero imports anywhere — and duplicates logic already in `farmer.service.ts`.
- Change: Delete it, or actually wire it into `farmer.service.ts` if a repository pattern is intentionally wanted going forward — pick one, don't leave both.
- Risk: None if deleting.

**P2 · `src/service.ts` · `package.json`**
- Problem: `service.ts` is empty and unimported. `express`/`@types/express` are listed as dependencies but never imported anywhere in `src/`.
- Change: Delete the empty file; remove the unused dependency pair.
- Risk: None — both confirmed unused via grep.

**P2 · `services/agri-officer.service.ts.ts`**
- Problem: Double `.ts.ts` filename typo.
- Change: Rename to `agri-officer.service.ts` and update the single import site in `distress.service.ts`.
- Risk: Low — one call site to update.

**P2 · `geocoding.service.ts` · `weather.service.ts` · `market.service.ts`**
- Problem: Three independent, hand-rolled `fetch` + `response.ok` + JSON-cast implementations, none with a request timeout.
- Change: Optionally factor a tiny shared fetch helper with `AbortSignal.timeout(...)`, used by all three.
- Risk: Low, genuinely optional — only worth it if time allows.

**P2 · `geocoding.service.ts`**
- Problem: Geocodes by village name alone and always takes `results[0]`, ignoring the district/state it already receives — risk of resolving to a same-named village elsewhere in India.
- Change: Prefer a result whose `admin1`/`admin2` matches the farmer's stated state/district before falling back to the first result.
- Risk: Low — improves accuracy without changing the function's signature or callers.

**P2 · WeatherObservation usage (product decision)**
- Problem: Rows are written on every weather fetch but never read back anywhere.
- Change: Either build a read path (e.g., expose farmer weather history) or stop writing until that's needed — a product decision for the team, not a pure code fix.
- Risk: None either way.

---

## Backend health summary

| | |
|---|---|
| **Architecture** | Clean route → controller → service separation in structure; inconsistent in the error-handling half of the controller layer. One abandoned repository-pattern duplication. |
| **Database** | 2 models, correctly typed, migrations verified in sync with schema. Sufficient for what's implemented; one table (`WeatherObservation`) is currently write-only. |
| **API layer** | 6 endpoints, all reachable and wired end-to-end. 3 of 6 return the wrong HTTP status for common, expected failure modes. |
| **Business logic** | Advisory and distress-scoring formulas are deterministic, explainable, and appropriately scoped for a prototype. The distress score's inputs are not yet derived from any real farmer/weather/market data — a scope gap, not a bug. |
| **External APIs** | Weather and geocoding fully functional (Open-Meteo, no key required). Market fully coded but blocked by a blank `DATA_GOV_API_KEY`. No timeouts on any of the three. |
| **Validation** | Zod is used consistently for input shape, but its failure is handled two different ways across controllers. Verified, real compile error currently blocks `npm run build`. |
| **Error handling** | No global error handler. One controller has no error boundary at all; three others collapse every failure to 500 regardless of cause. |
| **Security** | No SQL injection or SSRF surface (Prisma-only queries, fixed external hosts). No authentication anywhere — every endpoint, including a full farmer PII list, is open. Acceptable for a hackathon demo, not for anything beyond it. |
| **Testing** | Zero tests exist. Four small, high-value targets identified (distress scoring, advisory thresholds, officer lookup, schema boundaries). |
| **Deployment** | Cannot deploy via its own `build`/`start` scripts as configured today — verified by actually running them. `npm run dev` works and has been masking this. |
| **Overall** | **A functionally complete hackathon prototype with one genuine, verified deployment blocker and a consistent, fixable pattern of error-handling inconsistency.** The core domain logic (advisory thresholds, distress scoring, officer routing) is sound, deterministic, and appropriately scoped. The highest-leverage fixes are all in Part 19's P0 list and are small, isolated, and low-risk to make. |
