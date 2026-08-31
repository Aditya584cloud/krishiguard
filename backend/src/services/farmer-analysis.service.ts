import { prisma } from "../lib/prisma.js";
import { getFarmerById } from "./farmer.service.js";
import { getAdvisory } from "./advisory.service.js";
import { getMarketComparison } from "./market.service.js";
import { getDistressRisk } from "./distress.service.js";

// The 6-hour freshness window, measured from the last SUCCESSFUL refresh —
// never from page load/visit, and never advanced by a failed attempt.
const FRESHNESS_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface FarmerAnalysisResult {
  market: unknown | null;
  advisory: unknown | null;
  distress: unknown | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  refreshFailed: boolean;
  refreshError: string | null;
  /** True if this call itself performed a refresh (vs. serving a cached snapshot). */
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

/**
 * Returns the farmer's current coherent Market + Advisory + Distress
 * snapshot, transparently refreshing it if it's missing or 6+ hours stale.
 *
 * A refresh is all-or-nothing: all three are recomputed and persisted
 * together, or (on any failure) none of them are touched — this is what
 * guarantees Market/Advisory/Distress never end up showing a mix of old and
 * new data. A failed refresh never deletes or overwrites prior successful
 * results; it only records the failure so the caller can show "Unable to
 * refresh" and offer a retry (which is just calling this again).
 */
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

    // Record the failed attempt without touching the previous successful
    // results (if any) — an upsert here still needs a `create` branch for
    // a farmer whose very first refresh attempt fails, in which case there
    // is honestly nothing to show yet.
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
