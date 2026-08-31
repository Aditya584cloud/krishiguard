import type { DistressInput } from "../schemas/distress.schema.js";
import { getFarmerById } from "./farmer.service.js";
import { findAgriOfficer } from "./agri-officer.service.js";
import { getRainfallSignal } from "./rainfall.service.js";
import { getMarketSignal } from "./market.service.js";
import { predictDistressRisk } from "../ml/risk-model.js";
import type { RiskFeatureInput } from "../ml/risk-model.js";

function daysUntil(date: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const dueMidnight = new Date(date);
  dueMidnight.setUTCHours(0, 0, 0, 0);
  return Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / msPerDay);
}

export const getDistressRisk = async (data: DistressInput) => {
  const farmer = await getFarmerById(data.farmerId);
  if (!farmer) {
    throw new Error("Farmer not found");
  }

  let rainfallDeviationPercent: number | null = null;
  let rainfallSource: string;
  let rainfallNote: string;

  if (farmer.latitude === null || farmer.longitude === null) {
    rainfallSource = "UNAVAILABLE";
    rainfallNote = "Farmer location has not been resolved, so a rainfall signal could not be derived.";
  } else {
    const signal = await getRainfallSignal(farmer.latitude, farmer.longitude);
    rainfallDeviationPercent = signal.deviationPercent;
    rainfallSource = signal.source;
    rainfallNote =
      signal.source === "OPEN_METEO_HISTORICAL"
        ? `Observed ${signal.observedMm}mm vs. a ${signal.baselineYearsUsed}-year historical baseline of ${signal.baselineMm}mm over the last ${signal.windowDays} days (Open-Meteo).`
        : `A real historical baseline could not be obtained; using an explicitly labeled demo baseline (${signal.baselineMm}mm / ${signal.windowDays} days).`;
  }

  let priceChangePercent: number | null = null;
  let marketSource: string;
  let marketNote: string;

  try {
    const marketSignal = await getMarketSignal(farmer, farmer.primaryCrop);
    priceChangePercent = marketSignal.priceChangePercent;
    marketSource = "DATA_GOV_IN";
    marketNote =
      marketSignal.priceChangePercent !== null
        ? `${marketSignal.priceChangeBasis}`
        : marketSignal.scope === "NO_DATA"
          ? `No mandi price data available for ${farmer.primaryCrop} to derive a price trend.`
          : marketSignal.scope === "OTHER_MARKETS"
            ? `Only prices from markets outside ${farmer.state} were available for ${farmer.primaryCrop} — real data, but not used as this farmer's local price-change signal.`
            : "Mandi data available, but only for a single reporting date — a price change could not be derived.";
  } catch (error) {
    marketSource = "UNAVAILABLE";
    marketNote = `Market signal unavailable: ${error instanceof Error ? error.message : "unknown error"}.`;
  }

  const loanProximityDays =
    farmer.hasActiveLoan && farmer.loanDueDate
      ? daysUntil(farmer.loanDueDate)
      : null;

  const featureInput: RiskFeatureInput = {
    rainfallDeviationPercent,
    priceChangePercent,
    loanProximityDays,
  };

  const prediction = predictDistressRisk(featureInput);

  const reasons: string[] = [];

  if (rainfallDeviationPercent !== null && rainfallDeviationPercent <= -20) {
    reasons.push(
      `Rainfall is ${Math.abs(rainfallDeviationPercent)}% below the expected baseline.`,
    );
  } else if (rainfallDeviationPercent !== null && rainfallDeviationPercent >= 20) {
    reasons.push(
      `Rainfall is ${rainfallDeviationPercent}% above the expected baseline, which can also stress crops.`,
    );
  }

  if (priceChangePercent !== null && priceChangePercent <= -10) {
    reasons.push(
      `${farmer.primaryCrop} market price has fallen ${Math.abs(priceChangePercent)}% recently.`,
    );
  } else if (priceChangePercent !== null && priceChangePercent >= 10) {
    reasons.push(`${farmer.primaryCrop} market price has risen ${priceChangePercent}% recently.`);
  }

  if (loanProximityDays !== null) {
    if (loanProximityDays <= 0) {
      reasons.push(`Loan repayment is overdue by ${Math.abs(loanProximityDays)} day(s).`);
    } else if (loanProximityDays <= 30) {
      reasons.push(`Loan repayment is due in ${loanProximityDays} day(s).`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("No elevated distress signals were detected from the available data.");
  }

  let alert: { status: "NO_OFFICER_FOUND" } | { status: "ROUTED"; officer: ReturnType<typeof findAgriOfficer> } | null = null;
  if (prediction.riskLevel === "HIGH") {
    const officer = findAgriOfficer(farmer.district, farmer.state);
    alert = officer
      ? {
          status: "ROUTED",
          officer: {
            id: officer.id,
            name: officer.name,
            phone: officer.phone,
            district: officer.district,
            state: officer.state,
          },
        }
      : { status: "NO_OFFICER_FOUND" };
  }

  return {
    farmer: {
      id: farmer.id,
      name: farmer.name,
      village: farmer.village,
      district: farmer.district,
    },
    riskScore: prediction.riskScore,
    riskLevel: prediction.riskLevel,
    probability: prediction.probability,
    factors: prediction.factors,
    reasons,
    dataSources: {
      rainfall: { source: rainfallSource, note: rainfallNote },
      market: { source: marketSource, note: marketNote },
      loan: {
        source: farmer.hasActiveLoan ? "FARMER_FINANCIAL_PROFILE_DEMO" : "NO_ACTIVE_LOAN",
        note: farmer.hasActiveLoan
          ? "Demo/simulated financial profile stored on the farmer record — no real bank or government record was accessed."
          : "No active loan is recorded for this farmer.",
      },
    },
    model: prediction.modelInfo,
    alert,
  };
};
