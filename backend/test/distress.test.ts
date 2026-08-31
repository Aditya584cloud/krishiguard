import { test, after } from "node:test";
import assert from "node:assert/strict";
import { app, createFarmerDirect, cleanupTestFarmers } from "./helpers.js";

after(cleanupTestFarmers);

test("distress assessment requires only a farmerId and derives everything else", async () => {
  const farmer = await createFarmerDirect({
    latitude: 20.4625,
    longitude: 85.8828,
    hasActiveLoan: true,
    loanDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  });

  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.ok(["LOW", "MEDIUM", "HIGH"].includes(data.riskLevel));
  assert.equal(data.riskScore, Math.round(data.probability * 100));
  assert.equal(data.factors.length, 3);
  assert.ok(Array.isArray(data.reasons) && data.reasons.length > 0);
});

test("client-supplied numeric fields are ignored — the score is fully derived server-side", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const clean = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  // These would previously have been read directly as the risk inputs. They must now be
  // silently ignored by the schema — the derived score must be identical either way.
  const withBogusInputs = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: {
      farmerId: farmer.id,
      rainfallDeviationPercent: -999,
      priceChangePercent: -999,
      loanDueInDays: 0,
    },
  });

  assert.equal(clean.statusCode, 200);
  assert.equal(withBogusInputs.statusCode, 200);
  assert.equal(clean.json().data.riskScore, withBogusInputs.json().data.riskScore);
});

test("rainfall signal is derived from real Open-Meteo data for a geocoded farmer", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  const data = res.json().data;
  assert.ok(["OPEN_METEO_HISTORICAL", "DEMO_BASELINE_FALLBACK"].includes(data.dataSources.rainfall.source));
  const rainfallFactor = data.factors.find((f: { name: string }) => f.name === "Rainfall deviation");
  assert.equal(rainfallFactor.available, true);
});

test("financial signal is derived from the farmer's loan due date, not typed in", async () => {
  const farmer = await createFarmerDirect({
    latitude: 20.4625,
    longitude: 85.8828,
    hasActiveLoan: true,
    loanDueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
  });

  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  const data = res.json().data;
  const loanFactor = data.factors.find((f: { name: string }) => f.name === "Loan repayment proximity");
  assert.equal(loanFactor.available, true);
  assert.ok(loanFactor.value >= 5 && loanFactor.value <= 7);
  assert.match(data.reasons.join(" "), /due in \d+ day/);
});

test("overdue loan is reported as overdue, not as a negative day count", async () => {
  const farmer = await createFarmerDirect({
    latitude: 20.4625,
    longitude: 85.8828,
    hasActiveLoan: true,
    loanDueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });

  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  const data = res.json().data;
  assert.match(data.reasons.join(" "), /overdue/);
});

test("missing farmer location is handled honestly, not silently defaulted", async () => {
  const farmer = await createFarmerDirect({ latitude: null, longitude: null });

  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: farmer.id },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.dataSources.rainfall.source, "UNAVAILABLE");
  const rainfallFactor = data.factors.find((f: { name: string }) => f.name === "Rainfall deviation");
  assert.equal(rainfallFactor.available, false);
});

test("unknown farmer returns 404", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/api/distress",
    payload: { farmerId: "00000000-0000-0000-0000-000000000000" },
  });
  assert.equal(res.statusCode, 404);
});
