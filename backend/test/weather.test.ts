import { test, after } from "node:test";
import assert from "node:assert/strict";
import { app, createFarmerDirect, cleanupTestFarmers } from "./helpers.js";
import { getCurrentWeather } from "../src/services/weather.service.js";

after(cleanupTestFarmers);

test("weather for a farmer with resolved coordinates returns a current observation", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const res = await app.inject({ method: "GET", url: `/api/farmers/${farmer.id}/weather` });
  assert.equal(res.statusCode, 200);

  const data = res.json().data;
  assert.equal(typeof data.weather.temperatureC, "number");
  assert.equal(typeof data.weather.observedAt, "string");
});

test("weather for a farmer without coordinates returns 422", async () => {
  const farmer = await createFarmerDirect({ latitude: null, longitude: null });

  const res = await app.inject({ method: "GET", url: `/api/farmers/${farmer.id}/weather` });
  assert.equal(res.statusCode, 422);
  assert.equal(res.json().success, false);
});

test("invalid coordinates on GET /api/weather are rejected with 400", async () => {
  const res = await app.inject({ method: "GET", url: "/api/weather?lat=999&lon=999" });
  assert.equal(res.statusCode, 400);
});

test("upstream weather API failure surfaces as a thrown error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("service unavailable", { status: 503 })) as typeof fetch;

  try {
    await assert.rejects(() => getCurrentWeather(20, 85));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("malformed weather API response surfaces as a thrown error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ latitude: 20, longitude: 85 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  try {
    await assert.rejects(() => getCurrentWeather(20, 85));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("weather API timeout surfaces as a thrown error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    throw error;
  }) as typeof fetch;

  try {
    await assert.rejects(() => getCurrentWeather(20, 85));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
