
import { MODEL_ARTIFACT } from "./model-artifact.js";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskFeatureInput {
  rainfallDeviationPercent: number | null;
  priceChangePercent: number | null;
  loanProximityDays: number | null;
}

export interface RiskFactor {
  name: string;
  value: number | null;
  unit: string;
  available: boolean;
  contributionShare: number;
}

export interface RiskPrediction {
  probability: number;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  modelInfo: {
    type: string;
    trainingDataSource: "SYNTHETIC_DEMO";
    trainedAt: string;
    evaluatedAccuracy: number;
    evaluatedF1: number;
    note: string;
  };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function predictDistressRisk(input: RiskFeatureInput): RiskPrediction {
  const { weights, bias, riskLevelThresholds } = MODEL_ARTIFACT;

  const rainfallDroughtSeverity =
    input.rainfallDeviationPercent === null
      ? 0
      : clamp(-input.rainfallDeviationPercent, 0, 100) / 100;

  const priceCrashSeverity =
    input.priceChangePercent === null
      ? 0
      : clamp(-input.priceChangePercent, 0, 100) / 100;

  const loanUrgency =
    input.loanProximityDays === null
      ? 0
      : clamp(30 - input.loanProximityDays, 0, 30) / 30;

  const contributions = {
    rainfallDroughtSeverity:
      weights.rainfallDroughtSeverity * rainfallDroughtSeverity,
    priceCrashSeverity: weights.priceCrashSeverity * priceCrashSeverity,
    loanUrgency: weights.loanUrgency * loanUrgency,
  };

  const logit =
    bias +
    contributions.rainfallDroughtSeverity +
    contributions.priceCrashSeverity +
    contributions.loanUrgency;

  const probability = sigmoid(logit);
  const riskScore = Math.round(probability * 100);

  const riskLevel: RiskLevel =
    probability >= riskLevelThresholds.high
      ? "HIGH"
      : probability >= riskLevelThresholds.low
        ? "MEDIUM"
        : "LOW";

  const totalAbsContribution =
    Math.abs(contributions.rainfallDroughtSeverity) +
    Math.abs(contributions.priceCrashSeverity) +
    Math.abs(contributions.loanUrgency) || 1;

  const factors: RiskFactor[] = [
    {
      name: "Rainfall deviation",
      value: input.rainfallDeviationPercent,
      unit: "%",
      available: input.rainfallDeviationPercent !== null,
      contributionShare:
        Math.abs(contributions.rainfallDroughtSeverity) / totalAbsContribution,
    },
    {
      name: "Market price change",
      value: input.priceChangePercent,
      unit: "%",
      available: input.priceChangePercent !== null,
      contributionShare:
        Math.abs(contributions.priceCrashSeverity) / totalAbsContribution,
    },
    {
      name: "Loan repayment proximity",
      value: input.loanProximityDays,
      unit: "days",
      available: input.loanProximityDays !== null,
      contributionShare:
        Math.abs(contributions.loanUrgency) / totalAbsContribution,
    },
  ];

  return {
    probability: Math.round(probability * 1000) / 1000,
    riskScore,
    riskLevel,
    factors,
    modelInfo: {
      type: "Prototype logistic regression (3 features)",
      trainingDataSource: MODEL_ARTIFACT.training.dataSource,
      trainedAt: MODEL_ARTIFACT.trainedAt,
      evaluatedAccuracy: MODEL_ARTIFACT.evaluation.accuracy,
      evaluatedF1: MODEL_ARTIFACT.evaluation.f1,
      note: "Trained on synthetic/demo data for this SIH prototype - not a clinically or financially validated predictor.",
    },
  };
}
