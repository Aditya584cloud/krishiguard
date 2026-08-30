import type { DistressInput } from "../schemas/distress.schema.js";
import { getFarmerById } from "./farmer.service.js";
import { findAgriOfficer } from "./agri-officer.service.js";

export const getDistressRisk = async (data: DistressInput) => {
  const farmer = await getFarmerById(data.farmerId);
  if (!farmer) {
    throw new Error("Farmer not found");
  }
  let score = 0;
  const reasons: string[] = [];
  if (data.rainfallDeviationPercent <= -30) {
    score += 35;
    reasons.push("Rainfall is significantly below normal.");
  } 
  else if (data.rainfallDeviationPercent >= 30) {
    score += 25;
    reasons.push("Rainfall is significantly above normal.");
  }

  if (data.priceChangePercent <= -20) {
    score += 35;
    reasons.push("Crop market price has fallen significantly.");
  } 
  else if (data.priceChangePercent <= -10) {
    score += 20;
    reasons.push("Crop market price has declined.");
  }

  if (data.loanDueInDays <= 7) {
    score += 30;
    reasons.push("Loan repayment is due within one week.");
  } 
  else if (data.loanDueInDays <= 30) {
    score += 15;
    reasons.push("Loan repayment is due within one month.");
  }

  score = Math.min(score, 100);
  let riskLevel: "LOW" | "MEDIUM" | "HIGH";

  if (score >= 60) {
    riskLevel = "HIGH";
  } else if (score >= 30) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  let alert = null;
  if (riskLevel === "HIGH") {
    const officer = findAgriOfficer(
      farmer.district,
      farmer.state,
    );

    if (officer) {
      alert = {status: "ROUTED",
        officer: {
          id: officer.id,
          name: officer.name,
          phone: officer.phone,
          district: officer.district,
          state: officer.state,
        },
      };
    } else {
      alert = {status: "NO_OFFICER_FOUND"};
    }
  }

  return {
    farmer: {
      id: farmer.id,
      name: farmer.name,
      village: farmer.village,
      district: farmer.district,
    },
    riskScore: score,
    riskLevel,
    reasons,
    alert,
  };
};