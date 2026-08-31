import { test, after } from "node:test";
import assert from "node:assert/strict";
import { app, createFarmerDirect, cleanupTestFarmers } from "./helpers.js";
import { generateFarmerAdvisory } from "../src/services/advisory.translation.js";

after(cleanupTestFarmers);

test("valid advisory request uses the farmer's stored crop, soil and weather", async () => {
  const farmer = await createFarmerDirect({
    latitude: 20.4625,
    longitude: 85.8828,
    primaryCrop: "Paddy",
    soilType: "Black",
    language: "English",
  });

  const res = await app.inject({
    method: "POST",
    url: "/api/advisory",
    payload: { farmerId: farmer.id },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.crop, "Paddy");
  assert.equal(data.soil, "Black");
  assert.equal(data.language, "English");
  assert.ok(Array.isArray(data.recommendations) && data.recommendations.length > 0);
  assert.equal(typeof data.weather.temperatureC, "number");
});

test("an explicit too-short crop override is rejected with 400", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const res = await app.inject({
    method: "POST",
    url: "/api/advisory",
    payload: { farmerId: farmer.id, crop: "A" },
  });

  assert.equal(res.statusCode, 400);
});

test("an explicit too-short soil override is rejected with 400", async () => {
  const farmer = await createFarmerDirect({ latitude: 20.4625, longitude: 85.8828 });

  const res = await app.inject({
    method: "POST",
    url: "/api/advisory",
    payload: { farmerId: farmer.id, soil: "A" },
  });

  assert.equal(res.statusCode, 400);
});

test("soil type changes the advisory text for identical weather", () => {
  const heavyRain = { crop: "Paddy", temperatureC: 28, humidityPercent: 60, rainMm: 20 };

  const clayAdvisory = generateFarmerAdvisory("English", { ...heavyRain, soilType: "Clay" });
  const sandyAdvisory = generateFarmerAdvisory("English", { ...heavyRain, soilType: "Sandy" });

  assert.notDeepEqual(clayAdvisory, sandyAdvisory);
  assert.match(clayAdvisory[0]!, /waterlog/i);
});

test("dry-soil heat advisory differs from retentive-soil heat advisory", () => {
  const hotDay = { crop: "Paddy", temperatureC: 40, humidityPercent: 50, rainMm: 0 };

  const sandyAdvisory = generateFarmerAdvisory("English", { ...hotDay, soilType: "Sandy" });
  const clayAdvisory = generateFarmerAdvisory("English", { ...hotDay, soilType: "Clay" });

  assert.notDeepEqual(sandyAdvisory, clayAdvisory);
});
