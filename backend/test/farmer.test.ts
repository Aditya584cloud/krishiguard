import { test, after } from "node:test";
import assert from "node:assert/strict";
import { app, baseFarmerPayload, cleanupTestFarmers, trackFarmer } from "./helpers.js";

after(cleanupTestFarmers);

test("register farmer succeeds with a valid payload", async () => {
  const payload = baseFarmerPayload();
  const res = await app.inject({ method: "POST", url: "/api/farmers", payload });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  trackFarmer(body.data.id);
  assert.equal(body.success, true);
  assert.equal(body.data.phone, payload.phone);
  assert.equal(body.data.primaryCrop, "Paddy");
  assert.equal(body.data.soilType, "Alluvial");
});

test("duplicate phone number is rejected with 409", async () => {
  const payload = baseFarmerPayload();
  const first = await app.inject({ method: "POST", url: "/api/farmers", payload });
  assert.equal(first.statusCode, 201);
  trackFarmer(first.json().data.id);

  const second = await app.inject({ method: "POST", url: "/api/farmers", payload });
  assert.equal(second.statusCode, 409);
  assert.equal(second.json().success, false);
});

test("invalid farmer data is rejected with 400 and field errors", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/farmers",
    payload: { name: "A" },
  });

  assert.equal(res.statusCode, 400);
  const body = res.json();
  assert.equal(body.success, false);
  assert.ok(body.details);
});

test("active loan without a due date is rejected", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/farmers",
    payload: baseFarmerPayload({ hasActiveLoan: true }),
  });

  assert.equal(res.statusCode, 400);
});

test("get farmer list returns an array", async () => {
  const res = await app.inject({ method: "GET", url: "/api/farmers" });
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.json().data));
});

test("get farmer by id returns the created farmer", async () => {
  const payload = baseFarmerPayload();
  const created = await app.inject({ method: "POST", url: "/api/farmers", payload });
  const id = trackFarmer(created.json().data.id);

  const res = await app.inject({ method: "GET", url: `/api/farmers/${id}` });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().data.id, id);
});

test("farmer not found returns 404", async () => {
  const res = await app.inject({ method: "GET", url: "/api/farmers/00000000-0000-0000-0000-000000000000" });
  assert.equal(res.statusCode, 404);
});
