import { prisma } from "../lib/prisma.js";
import { getFarmerById } from "./farmer.service.js";
import { getAdvisory } from "./advisory.service.js";
import { getMarketComparison } from "./market.service.js";
import { getDistressRisk } from "./distress.service.js";

const FRESHNESS_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface FarmerAnalysisResult {
  market: unknown | null;
  advisory: unknown | null;
  distress: unknown | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  refreshFailed: boolean;
  refreshError: string | null;
  refreshedNow: boolean;
}

function isFresh(lastSuccessAt: Date | null): boolean {
  if (!lastSuccessAt) return false;
  return Date.now() - lastSuccessAt.getTime() < FRESHNESS_WINDOW_MS;
}

function toResult(row: {
  marketResult: unknown;
  advisoryResult: unknown;
  distressResult: unknown;
  lastSuccessAt: Date | null;
  lastAttemptAt: Date | null;
  lastError: string | null;
}, refreshedNow: boolean): FarmerAnalysisResult {
  return {
    market: row.marketResult ?? null,
    advisory: row.advisoryResult ?? null,
    distress: row.distressResult ?? null,
    lastSuccessAt: row.lastSuccessAt ? row.lastSuccessAt.toISOString() : null,
    lastAttemptAt: row.lastAttemptAt ? row.lastAttemptAt.toISOString() : null,
    refreshFailed: row.lastError !== null,
    refreshError: row.lastError,
    refreshedNow,
  };
}

export async function getOrRefreshFarmerAnalysis(farmerId: string): Promise<FarmerAnalysisResult> {
  const farmer = await getFarmerById(farmerId);
  if (!farmer) {
    throw new Error("Farmer not found");
  }

  const existing = await prisma.farmerAnalysis.findUnique({ where: { farmerId } });

  if (existing && isFresh(existing.lastSuccessAt)) {
    return toResult(existing, false);
  }

  const now = new Date();

  try {
    const [market, advisory, distress] = await Promise.all([
      getMarketComparison({ farmerId }),
      getAdvisory({ farmerId }),
      getDistressRisk({ farmerId }),
    ]);

    const updated = await prisma.farmerAnalysis.upsert({
      where: { farmerId },
      create: {
        farmerId,
        marketResult: market as object,
        advisoryResult: advisory as object,
        distressResult: distress as object,
        lastSuccessAt: now,
        lastAttemptAt: now,
        lastError: null,
      },
      update: {
        marketResult: market as object,
        advisoryResult: advisory as object,
        distressResult: distress as object,
        lastSuccessAt: now,
        lastAttemptAt: now,
        lastError: null,
      },
    });

    return toResult(updated, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error during refresh";
    console.error(`Farmer analysis refresh failed for farmer ${farmerId}:`, error);
  
    const updated = await prisma.farmerAnalysis.upsert({
      where: { farmerId },
      create: {
        farmerId,
        lastAttemptAt: now,
        lastError: message,
      },
      update: {
        lastAttemptAt: now,
        lastError: message,
      },
    });

    return toResult(updated, false);
  }
}
