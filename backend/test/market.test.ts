import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  app,
  createFarmerDirect,
  cleanupTestFarmers,
  seedMandiPrice,
  cleanupTestMandiPrices,
} from "./helpers.js";
import { getMarketSignal } from "../src/services/market.service.js";
import { getDistressRisk } from "../src/services/distress.service.js";

after(cleanupTestFarmers);
after(cleanupTestMandiPrices);

test("district market lookup returns locally synchronized data with DISTRICT scope", async () => {
  await seedMandiPrice({ state: "TestState1", district: "TestDistrictA", commodity: "Onion" });
  const farmer = await createFarmerDirect({ state: "TestState1", district: "TestDistrictA" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "Onion" },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.scope, "DISTRICT");
  assert.equal(data.dataSource, "DATA_GOV_IN");
  assert.equal(data.markets.length, 1);
  assert.equal(data.comparison.highestPrice, 2100);
});

test("no district records falls back to state-wide results", async () => {
  await seedMandiPrice({
    state: "TestState2",
    district: "OtherDistrict",
    market: "Other APMC",
    commodity: "Onion",
  });
  const farmer = await createFarmerDirect({ state: "TestState2", district: "TestDistrictNoData" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "Onion" },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.scope, "STATE");
  assert.equal(data.markets[0].district, "OtherDistrict");
});

test("no synchronized data anywhere returns an honest NO_DATA scope", async () => {
  const farmer = await createFarmerDirect({ state: "TestStateEmpty", district: "TestDistrictEmpty" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "Zzznonexistentcropxyz" },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.scope, "NO_DATA");
  assert.deepEqual(data.markets, []);
  assert.equal(data.priceChangePercent, null);
});

test("'Paddy' is normalized to the government commodity 'Paddy(Common)' — not 'Rice'", async () => {
  await seedMandiPrice({
    state: "TestState3",
    district: "TestDistrictB",
    commodity: "Paddy(Common)",
    modalPrice: 1900,
  });
  // A decoy 'Rice' record must never be returned for a "Paddy" query.
  await seedMandiPrice({
    state: "TestState3",
    district: "TestDistrictB",
    market: "Rice Market",
    commodity: "Rice",
    modalPrice: 5000,
  });

  const farmer = await createFarmerDirect({ state: "TestState3", district: "TestDistrictB" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "Paddy" },
  });

  const data = res.json().data;
  assert.equal(data.scope, "DISTRICT");
  assert.equal(data.markets.length, 1);
  assert.equal(data.markets[0].commodity, "Paddy(Common)");
  assert.equal(data.comparison.highestPrice, 1900);
});

test("'Bajra' is normalized to the government commodity 'Bajra(Pearl Millet/Cumbu)'", async () => {
  await seedMandiPrice({
    state: "TestState6",
    district: "TestDistrictE",
    commodity: "Bajra(Pearl Millet/Cumbu)",
    modalPrice: 2200,
  });

  const farmer = await createFarmerDirect({ state: "TestState6", district: "TestDistrictE" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "Bajra" },
  });

  const data = res.json().data;
  assert.equal(data.scope, "DISTRICT");
  assert.equal(data.markets.length, 1);
  assert.equal(data.markets[0].commodity, "Bajra(Pearl Millet/Cumbu)");
});

test("price change is computed from real records spanning multiple stored arrival dates", async () => {
  await seedMandiPrice({
    state: "TestState4",
    district: "TestDistrictC",
    commodity: "Tomato",
    arrivalDate: new Date("2026-08-20T00:00:00.000Z"),
    modalPrice: 1000,
  });
  await seedMandiPrice({
    state: "TestState4",
    district: "TestDistrictC",
    commodity: "Tomato",
    arrivalDate: new Date("2026-08-25T00:00:00.000Z"),
    modalPrice: 1200,
  });

  const signal = await getMarketSignal({ state: "TestState4", district: "TestDistrictC" }, "Tomato");

  assert.notEqual(signal.priceChangePercent, null);
  assert.equal(signal.priceChangePercent, 20); // (1200 - 1000) / 1000 * 100
  assert.match(signal.priceChangeBasis ?? "", /2026-08-25/);
});

test("price change is null (never fabricated) when only one arrival date is stored", async () => {
  await seedMandiPrice({
    state: "TestState5",
    district: "TestDistrictD",
    commodity: "Cauliflower",
    arrivalDate: new Date("2026-08-30T00:00:00.000Z"),
  });

  const signal = await getMarketSignal({ state: "TestState5", district: "TestDistrictD" }, "Cauliflower");

  assert.equal(signal.priceChangePercent, null);
  assert.equal(signal.priceChangeBasis, null);
});

test("other-state fallback: no district/state data prefers a real neighboring state first", async () => {
  // West Bengal is a real, documented neighbor of Odisha; Rajasthan is not.
  await seedMandiPrice({
    state: "West Bengal",
    district: "Kolkata",
    market: "Kolkata APMC",
    commodity: "TestCommodityXYZ",
    modalPrice: 3000,
  });
  await seedMandiPrice({
    state: "Rajasthan",
    district: "Jaipur",
    market: "Jaipur APMC",
    commodity: "TestCommodityXYZ",
    modalPrice: 4000,
  });

  const farmer = await createFarmerDirect({ state: "Odisha", district: "ZzzNoDataOdishaDistrict" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "TestCommodityXYZ" },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.scope, "OTHER_MARKETS");
  assert.equal(data.markets.length, 2);
  assert.equal(data.markets[0].state, "West Bengal", "the real Odisha-neighboring state should be listed first");
  assert.match(data.message, /Odisha/);
  assert.match(data.message, /other markets/i);
});

test("other-state fallback still works for a farmer state with no listed neighbors", async () => {
  await seedMandiPrice({
    state: "Punjab",
    district: "Ludhiana",
    market: "Ludhiana APMC",
    commodity: "TestCommodityABC",
    modalPrice: 2500,
  });

  const farmer = await createFarmerDirect({ state: "Delhi", district: "ZzzNoDataDelhiDistrict" });

  const res = await app.inject({
    method: "POST",
    url: "/api/market",
    payload: { farmerId: farmer.id, crop: "TestCommodityABC" },
  });

  assert.equal(res.statusCode, 200);
  const data = res.json().data;
  assert.equal(data.scope, "OTHER_MARKETS");
  assert.equal(data.markets.length, 1);
  assert.equal(data.markets[0].state, "Punjab");
});

test("other-state records never produce a price-change signal, even across multiple dates", async () => {
  await seedMandiPrice({
    state: "West Bengal",
    district: "Kolkata",
    commodity: "TestCommodityMultiDate",
    arrivalDate: new Date("2026-08-20T00:00:00.000Z"),
    modalPrice: 1000,
  });
  await seedMandiPrice({
    state: "West Bengal",
    district: "Kolkata",
    commodity: "TestCommodityMultiDate",
    arrivalDate: new Date("2026-08-25T00:00:00.000Z"),
    modalPrice: 1500,
  });

  const signal = await getMarketSignal({ state: "Odisha", district: "ZzzNoDataOdishaDistrict2" }, "TestCommodityMultiDate");

  assert.equal(signal.scope, "OTHER_MARKETS");
  assert.equal(signal.priceChangePercent, null, "cross-state prices must never be used as a price-change signal");
  assert.equal(signal.priceChangeBasis, null);
});

test("distress does not use other-state market data as this farmer's price-change signal", async () => {
  await seedMandiPrice({
    state: "West Bengal",
    district: "Kolkata",
    commodity: "TestCommodityDistress",
    arrivalDate: new Date("2026-08-20T00:00:00.000Z"),
    modalPrice: 1000,
  });
  await seedMandiPrice({
    state: "West Bengal",
    district: "Kolkata",
    commodity: "TestCommodityDistress",
    arrivalDate: new Date("2026-08-25T00:00:00.000Z"),
    modalPrice: 2000, // a large, real jump — but it belongs to another state
  });

  const farmer = await createFarmerDirect({
    state: "Odisha",
    district: "ZzzNoDataOdishaDistrict3",
    primaryCrop: "TestCommodityDistress",
  });

  const result = await getDistressRisk({ farmerId: farmer.id });

  const marketFactor = result.factors.find((f) => f.name === "Market price change");
  assert.equal(marketFactor?.available, false);
  assert.equal(marketFactor?.value, null);
  assert.match(result.dataSources.market.note, /outside Odisha/);
});
