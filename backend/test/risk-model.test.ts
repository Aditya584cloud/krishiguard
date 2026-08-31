import { test } from "node:test";
import assert from "node:assert/strict";
import { predictDistressRisk } from "../src/ml/risk-model.js";
import { findAgriOfficer } from "../src/services/agri-officer.service.js";

test("severe drought + price crash + overdue loan classifies as HIGH risk", () => {
  const prediction = predictDistressRisk({
    rainfallDeviationPercent: -80,
    priceChangePercent: -50,
    loanProximityDays: 0,
  });

  assert.equal(prediction.riskLevel, "HIGH");
  assert.ok(prediction.probability >= 0.66);
  assert.equal(prediction.riskScore, Math.round(prediction.probability * 100));
});

test("normal rainfall, stable price and no loan urgency classifies as LOW risk", () => {
  const prediction = predictDistressRisk({
    rainfallDeviationPercent: 0,
    priceChangePercent: 0,
    loanProximityDays: 120,
  });

  assert.equal(prediction.riskLevel, "LOW");
});

test("unavailable signals are treated as neutral, not as missing/crashing the model", () => {
  const prediction = predictDistressRisk({
    rainfallDeviationPercent: null,
    priceChangePercent: null,
    loanProximityDays: null,
  });

  assert.equal(prediction.riskLevel, "LOW");
  assert.equal(prediction.factors.every((f) => !f.available), true);
});

test("factor contribution shares sum to ~1 when at least one signal is available", () => {
  const prediction = predictDistressRisk({
    rainfallDeviationPercent: -40,
    priceChangePercent: -20,
    loanProximityDays: 15,
  });

  const total = prediction.factors.reduce((sum, f) => sum + f.contributionShare, 0);
  assert.ok(Math.abs(total - 1) < 0.01);
});

test("known district routes to its registered agricultural officer", () => {
  const officer = findAgriOfficer("Cuttack", "Odisha");
  assert.ok(officer);
  assert.equal(officer!.district, "Cuttack");
});

test("unknown district returns undefined, never a fabricated officer", () => {
  const officer = findAgriOfficer("ZzzNoSuchDistrict", "Odisha");
  assert.equal(officer, undefined);
});
