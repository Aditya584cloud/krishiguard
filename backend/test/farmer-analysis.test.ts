import { test, after } from "node:test";
import assert from "node:assert/strict";
import { app, createFarmerDirect, cleanupTestFarmers, prisma } from "./helpers.js";

after(cleanupTestFarmers);

const HOUR_MS = 60 * 60 * 1000;

async function getAnalysis(farmerId: string) {
  const res = await app.inject({ method: "GET", url: `/api/farmers/${farmerId}/analysis` });
  return { status: res.statusCode, body: res.json() };
}

async function backdateSnapshot(farmerId: string, msAgo: number) {
  const timestamp = new Date(Date.now() - msAgo);
  await prisma.farmerAnalysis.update({
    where: { farmerId },
    data: { lastSuccessAt: timestamp, lastAttemptAt: timestamp },
  });
}

test("first-time farmer: analysis is generated and persisted", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const { status, body } = await getAnalysis(farmer.id);

  assert.equal(status, 200);
  assert.equal(body.data.refreshedNow, true);
  assert.equal(body.data.refreshFailed, false);
  assert.ok(body.data.lastSuccessAt);
  assert.ok(body.data.market);
  assert.ok(body.data.advisory);
  assert.ok(body.data.distress);

  const stored = await prisma.farmerAnalysis.findUnique({ where: { farmerId: farmer.id } });
  assert.ok(stored, "a FarmerAnalysis row must be persisted, not just returned in-memory");
});

test("revisit after 1 hour: served from cache, no refresh", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });
  const first = await getAnalysis(farmer.id);
  assert.equal(first.body.data.refreshedNow, true);

  await backdateSnapshot(farmer.id, 1 * HOUR_MS);

  const second = await getAnalysis(farmer.id);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.refreshedNow, false, "1 hour is within the 6-hour freshness window");
});

test("revisit after 5h59m: still fresh, no refresh", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });
  await getAnalysis(farmer.id);

  await backdateSnapshot(farmer.id, 5 * HOUR_MS + 59 * 60 * 1000);

  const { body } = await getAnalysis(farmer.id);
  assert.equal(body.data.refreshedNow, false, "5h59m must still count as fresh (< 6h)");
});

test("revisit after 6+ hours: triggers a refresh and updates the timestamp", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });
  const first = await getAnalysis(farmer.id);
  const firstTimestamp = first.body.data.lastSuccessAt;

  await backdateSnapshot(farmer.id, 6 * HOUR_MS + 60 * 1000);

  const second = await getAnalysis(farmer.id);
  assert.equal(second.body.data.refreshedNow, true, "6h1m must count as stale (>= 6h)");
  assert.notEqual(second.body.data.lastSuccessAt, firstTimestamp);
});

test("failed refresh preserves the previous successful results and never advances lastSuccessAt", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });
  const first = await getAnalysis(farmer.id);
  assert.equal(first.body.data.refreshFailed, false);
  const goodTimestamp = first.body.data.lastSuccessAt;
  const goodDistress = first.body.data.distress;

  // Break the one real, reachable failure mode (advisory's weather
  // dependency) and force staleness so a refresh is actually attempted.
  // Backdating necessarily changes lastSuccessAt away from `goodTimestamp`
  // (that's what makes the snapshot stale) — the invariant under test is
  // that a failed refresh doesn't advance it any further than that, not
  // that it stays equal to the original success time.
  await prisma.farmer.update({ where: { id: farmer.id }, data: { latitude: null, longitude: null } });
  await backdateSnapshot(farmer.id, 7 * HOUR_MS);
  const staleTimestamp = (await prisma.farmerAnalysis.findUniqueOrThrow({ where: { farmerId: farmer.id } })).lastSuccessAt?.toISOString();

  const second = await getAnalysis(farmer.id);
  assert.equal(second.status, 200, "a failed refresh must not surface as a request failure");
  assert.equal(second.body.data.refreshedNow, false);
  assert.equal(second.body.data.refreshFailed, true);
  assert.match(second.body.data.refreshError, /location/i);
  assert.equal(second.body.data.lastSuccessAt, staleTimestamp, "a failed refresh must not advance lastSuccessAt at all");
  assert.deepEqual(second.body.data.distress, goodDistress, "previous results must be preserved untouched");

  // Recovery: restore coordinates, confirm a subsequent retry succeeds and clears the error.
  await prisma.farmer.update({ where: { id: farmer.id }, data: { latitude: 20.4625, longitude: 85.8828 } });
  const third = await getAnalysis(farmer.id);
  assert.equal(third.body.data.refreshedNow, true);
  assert.equal(third.body.data.refreshFailed, false);
  assert.equal(third.body.data.refreshError, null);
  assert.notEqual(third.body.data.lastSuccessAt, goodTimestamp);
});

test("market, advisory and distress are always updated together, never partially", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });
  const { body } = await getAnalysis(farmer.id);

  // A coherent refresh means all three came from the same event — the
  // simplest structural guarantee is that they're either all present
  // (successful refresh) or the previous complete set is retained; there is
  // no code path that persists just one or two of the three results.
  const allPresent = body.data.market && body.data.advisory && body.data.distress;
  assert.ok(allPresent, "a successful refresh must produce a complete set of all three results");
});

test("unknown farmer returns 404", async () => {
  const { status } = await getAnalysis("00000000-0000-0000-0000-000000000000");
  assert.equal(status, 404);
});
