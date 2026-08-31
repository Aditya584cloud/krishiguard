import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "./helpers.js";
import { syncMandiPrices } from "../src/services/mandi-sync.service.js";
import { runSyncSafely } from "../src/services/mandi-scheduler.js";

// These tests stub globalThis.fetch to keep the suite fast and deterministic
// (the real data.gov.in sync fetches ~10k records over ~11 pages — see the
// manual real-API verification described in FINAL_AUDIT.md instead).

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function offsetFromUrl(url: string | URL): number {
  return Number(new URL(url).searchParams.get("offset") ?? "0");
}

const TEST_STATE = "SyncTestState";
const TEST_DISTRICT = "SyncTestDistrict";
const TEST_MARKET = "SyncTestMarket APMC";
const TEST_COMMODITY = "SyncTestCommodity";

async function cleanupSyncTestRows() {
  await prisma.mandiPrice.deleteMany({ where: { state: TEST_STATE } });
}

after(cleanupSyncTestRows);

test("successful synchronization upserts real records into MandiPrice", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    jsonResponse({
      total: 1,
      count: 1,
      records: [
        {
          state: TEST_STATE,
          district: TEST_DISTRICT,
          market: TEST_MARKET,
          commodity: TEST_COMMODITY,
          arrival_date: "30/08/2026",
          min_price: 1000,
          max_price: 1200,
          modal_price: 1100,
        },
      ],
    })) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, true);
    assert.equal(result.fetched, 1);
    assert.equal(result.upserted, 1);
    assert.equal(result.skippedMalformed, 0);

    const stored = await prisma.mandiPrice.findMany({ where: { state: TEST_STATE } });
    assert.equal(stored.length, 1);
    assert.equal(stored[0]!.modalPrice, 1100);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("pagination requests limit=1000 at offsets 0, 1000, 2000... and stops on a short page", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const requestedOffsets: number[] = [];
  const requestedLimits: number[] = [];

  const makeRecord = (n: number) => ({
    state: TEST_STATE,
    district: TEST_DISTRICT,
    market: `${TEST_MARKET} ${n}`,
    commodity: TEST_COMMODITY,
    arrival_date: "30/08/2026",
    min_price: 100,
    max_price: 120,
    modal_price: 110,
  });

  globalThis.fetch = (async (url: string | URL) => {
    calls += 1;
    const offset = offsetFromUrl(url);
    const limit = Number(new URL(url).searchParams.get("limit"));
    requestedOffsets.push(offset);
    requestedLimits.push(limit);

    if (offset === 0) {
      // A full page (== requested limit) — pagination must continue.
      return jsonResponse({ records: Array.from({ length: 1000 }, (_, i) => makeRecord(i)) });
    }
    // A short page (< requested limit) — pagination must stop here.
    return jsonResponse({ records: [makeRecord(1000), makeRecord(1001)] });
  }) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, true);
    assert.equal(calls, 2, "expected exactly two paginated requests: one full page, one short page");
    assert.deepEqual(requestedOffsets, [0, 1000], "expected offsets 0, 1000 — not 0, 1");
    assert.deepEqual(requestedLimits, [1000, 1000], "expected a fixed limit=1000 on every request");
    assert.equal(result.fetched, 1002);
    assert.equal(result.upserted, 1002);

    const stored = await prisma.mandiPrice.findMany({ where: { state: TEST_STATE } });
    assert.equal(stored.length, 1002);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("pagination continues well past 10 pages — no arbitrary page-count cap", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  // Records are deliberately malformed (missing `state`) so every one is
  // skipped without a real Prisma upsert — this keeps a 13-page test fast
  // while still exercising the exact same pagination/counting loop.
  const malformedRecord = () => ({
    district: TEST_DISTRICT,
    market: TEST_MARKET,
    commodity: TEST_COMMODITY,
    arrival_date: "30/08/2026",
    min_price: 100,
    max_price: 120,
    modal_price: 110,
  });

  globalThis.fetch = (async () => {
    calls += 1;
    // Pages 1-12 are full (1000 records); page 13 is short (500), ending pagination.
    const length = calls <= 12 ? 1000 : 500;
    return jsonResponse({ records: Array.from({ length }, malformedRecord) });
  }) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, true);
    assert.equal(calls, 13, "expected pagination to continue well beyond a 10-page limit");
    assert.equal(result.pages, 13);
    assert.equal(result.fetched, 12 * 1000 + 500);
    assert.equal(result.skippedMalformed, 12 * 1000 + 500);
    assert.equal(result.upserted, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("re-synchronizing the same record upserts in place rather than creating a duplicate", async () => {
  const originalFetch = globalThis.fetch;
  const makeResponse = (modalPrice: number) =>
    (async () =>
      jsonResponse({
        total: 1,
        count: 1,
        records: [
          {
            state: TEST_STATE,
            district: TEST_DISTRICT,
            market: TEST_MARKET,
            commodity: TEST_COMMODITY,
            arrival_date: "30/08/2026",
            min_price: 900,
            max_price: 1100,
            modal_price: modalPrice,
          },
        ],
      })) as typeof fetch;

  try {
    globalThis.fetch = makeResponse(1000);
    await syncMandiPrices();

    globalThis.fetch = makeResponse(1500); // price revised on re-sync
    await syncMandiPrices();

    const stored = await prisma.mandiPrice.findMany({ where: { state: TEST_STATE } });
    assert.equal(stored.length, 1, "expected an upsert, not a duplicate row");
    assert.equal(stored[0]!.modalPrice, 1500, "expected the record to be updated in place");
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("API timeout is logged and does not wipe previously stored data", async () => {
  const seeded = await prisma.mandiPrice.create({
    data: {
      state: TEST_STATE,
      district: TEST_DISTRICT,
      market: TEST_MARKET,
      commodity: TEST_COMMODITY,
      arrivalDate: new Date("2026-08-29T00:00:00.000Z"),
      minPrice: 500,
      maxPrice: 600,
      modalPrice: 550,
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    throw error;
  }) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, false);
    assert.ok(result.error);

    const stillThere = await prisma.mandiPrice.findUnique({ where: { id: seeded.id } });
    assert.ok(stillThere, "previously synced data must not be wiped on a failed sync");
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("API non-200 response is logged and does not wipe previously stored data", async () => {
  const seeded = await prisma.mandiPrice.create({
    data: {
      state: TEST_STATE,
      district: TEST_DISTRICT,
      market: TEST_MARKET,
      commodity: TEST_COMMODITY,
      arrivalDate: new Date("2026-08-29T00:00:00.000Z"),
      minPrice: 500,
      maxPrice: 600,
      modalPrice: 550,
    },
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("Service Unavailable", { status: 503 })) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, false);
    assert.match(result.error ?? "", /503/);

    const stillThere = await prisma.mandiPrice.findUnique({ where: { id: seeded.id } });
    assert.ok(stillThere, "previously synced data must not be wiped on a failed sync");
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("a malformed record is skipped without failing the whole synchronization", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    jsonResponse({
      total: 2,
      count: 2,
      records: [
        {
          state: TEST_STATE,
          district: TEST_DISTRICT,
          market: TEST_MARKET,
          commodity: TEST_COMMODITY,
          arrival_date: "30/08/2026",
          min_price: 1000,
          max_price: 1200,
          modal_price: 1100,
        },
        {
          // Malformed: missing commodity and a non-numeric price.
          state: TEST_STATE,
          district: TEST_DISTRICT,
          market: "Broken Market",
          arrival_date: "30/08/2026",
          min_price: "not-a-number",
          max_price: 1200,
          modal_price: 1100,
        },
      ],
    })) as typeof fetch;

  try {
    const result = await syncMandiPrices();
    assert.equal(result.success, true);
    assert.equal(result.skippedMalformed, 1);
    assert.equal(result.upserted, 1);

    const stored = await prisma.mandiPrice.findMany({ where: { state: TEST_STATE } });
    assert.equal(stored.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await cleanupSyncTestRows();
  }
});

test("scheduler's safety wrapper never throws, even when the sync itself fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;

  try {
    // syncMandiPrices catches all of its own errors and returns a result
    // object rather than throwing (by design), so this exercises the
    // scheduler's defensive wrapper end-to-end against a real failure mode:
    // it must resolve cleanly no matter what the sync reports.
    await assert.doesNotReject(() => runSyncSafely());
  } finally {
    globalThis.fetch = originalFetch;
  }
});
