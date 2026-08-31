import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export { app, prisma };

// Reserved prefix so test-created farmers are easy to identify.
const TEST_PHONE_PREFIX = "9999";

// Each test file runs in its own process under `node --test`, so this
// module-level array is naturally scoped to the file that imports it — one
// file's cleanup can never delete another concurrently-running file's
// fixtures (unlike a shared "delete everything with this phone prefix"
// query, which raced across files and caused flaky 404s).
const createdFarmerIds: string[] = [];

export function trackFarmer(id: string): string {
  createdFarmerIds.push(id);
  return id;
}

export function uniquePhone(): string {
  const suffix = Math.floor(100000 + Math.random() * 900000).toString();
  return `${TEST_PHONE_PREFIX}${suffix}`;
}

export function baseFarmerPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Automated Test Farmer",
    phone: uniquePhone(),
    language: "English",
    district: "Cuttack",
    state: "Odisha",
    village: "Cuttack",
    primaryCrop: "Paddy",
    soilType: "Alluvial",
    hasActiveLoan: false,
    ...overrides,
  };
}

/** Creates a farmer directly via Prisma, bypassing geocoding, for deterministic fixtures. */
export async function createFarmerDirect(overrides: Record<string, unknown> = {}) {
  const farmer = await prisma.farmer.create({
    data: {
      name: "Direct Fixture Farmer",
      phone: uniquePhone(),
      language: "English",
      district: "Cuttack",
      state: "Odisha",
      village: "Cuttack",
      primaryCrop: "Paddy",
      soilType: "Alluvial",
      latitude: null,
      longitude: null,
      hasActiveLoan: false,
      ...overrides,
    } as Parameters<typeof prisma.farmer.create>[0]["data"],
  });
  trackFarmer(farmer.id);
  return farmer;
}

/** Deletes only the farmers this test file itself created. */
export async function cleanupTestFarmers() {
  if (createdFarmerIds.length === 0) return;
  await prisma.farmer.deleteMany({
    where: { id: { in: createdFarmerIds } },
  });
}

const createdMandiPriceIds: string[] = [];

/** Seeds one MandiPrice row directly via Prisma, for deterministic market-lookup fixtures. */
export async function seedMandiPrice(overrides: Record<string, unknown> = {}) {
  const row = await prisma.mandiPrice.create({
    data: {
      state: "TestState",
      district: "TestDistrict",
      market: "Test APMC",
      commodity: "Paddy(Common)",
      arrivalDate: new Date("2026-08-30T00:00:00.000Z"),
      minPrice: 2000,
      maxPrice: 2200,
      modalPrice: 2100,
      ...overrides,
    } as Parameters<typeof prisma.mandiPrice.create>[0]["data"],
  });
  createdMandiPriceIds.push(row.id);
  return row;
}

/** Deletes only the MandiPrice rows this test file itself seeded. */
export async function cleanupTestMandiPrices() {
  if (createdMandiPriceIds.length === 0) return;
  await prisma.mandiPrice.deleteMany({
    where: { id: { in: createdMandiPriceIds } },
  });
}
