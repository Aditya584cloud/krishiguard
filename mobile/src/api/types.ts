// Mirrors the backend API contract exactly — the same contract the web
// frontend consumes (frontend/src/api/types.ts). Kept as an independent copy
// so the mobile app has zero file coupling to the frozen web app, but the
// *shapes* are intentionally identical: same backend, same endpoints.

export type Language = "English" | "Odia" | "Hindi";

export const SOIL_TYPES = [
  "Alluvial",
  "Black",
  "Red",
  "Laterite",
  "Sandy",
  "Clay",
  "Loamy",
] as const;
export type SoilType = (typeof SOIL_TYPES)[number];

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  language: Language;
  district: string;
  state: string;
  village: string;
  latitude: number | null;
  longitude: number | null;

  primaryCrop: string;
  soilType: SoilType;

  hasActiveLoan: boolean;
  loanDueDate: string | null;
  loanAmountRupees: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateFarmerInput {
  name: string;
  phone: string;
  language: Language;
  district: string;
  state: string;
  village: string;
  primaryCrop: string;
  soilType: SoilType;
  hasActiveLoan: boolean;
  loanDueDate?: string;
  loanAmountRupees?: number;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  rainMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  observedAt: string;
}

export interface FarmerWeather {
  farmer: Farmer;
  weather: WeatherData;
}

export interface AdvisoryResult {
  farmer: Pick<Farmer, "id" | "name" | "village" | "district">;
  crop: string;
  soil: string;
  language: string;
  weather: WeatherData;
  recommendations: string[];
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type DistressAlert =
  | null
  | { status: "NO_OFFICER_FOUND" }
  | {
      status: "ROUTED";
      officer: {
        id: string;
        name: string;
        phone: string;
        district: string;
        state: string;
      };
    };

export interface DistressFactor {
  name: string;
  value: number | null;
  unit: string;
  available: boolean;
  contributionShare: number;
}

export interface DistressDataSourceNote {
  source: string;
  note: string;
}

export interface DistressResult {
  farmer: Pick<Farmer, "id" | "name" | "village" | "district">;
  riskScore: number;
  riskLevel: RiskLevel;
  probability: number;
  factors: DistressFactor[];
  reasons: string[];
  dataSources: {
    rainfall: DistressDataSourceNote;
    market: DistressDataSourceNote;
    loan: DistressDataSourceNote;
  };
  model: {
    type: string;
    trainingDataSource: "SYNTHETIC_DEMO";
    trainedAt: string;
    evaluatedAccuracy: number;
    evaluatedF1: number;
    note: string;
  };
  alert: DistressAlert;
}

export type MarketScope = "DISTRICT" | "STATE" | "OTHER_MARKETS" | "NO_DATA";

export interface MarketRecord {
  state: string;
  market: string;
  district: string;
  commodity: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
}

export interface MarketComparison {
  highestPrice: number;
  highestPriceMarket: string;
  lowestPrice: number;
  lowestPriceMarket: string;
  averagePrice: number;
}

export interface MarketResult {
  farmer: Pick<Farmer, "id" | "name" | "village" | "district" | "state">;
  crop: string;
  scope: MarketScope;
  message: string;
  markets: MarketRecord[];
  comparison: MarketComparison | null;
  priceChangePercent: number | null;
  priceChangeBasis: string | null;
  dataSource: "DATA_GOV_IN";
}

// Persisted, coherent Market + Advisory + Distress snapshot for a farmer,
// refreshed together on a 6-hour freshness window — the SAME backend
// endpoint and policy the web app uses (GET /api/farmers/:id/analysis).
export interface FarmerAnalysisResult {
  market: MarketResult | null;
  advisory: AdvisoryResult | null;
  distress: DistressResult | null;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  refreshFailed: boolean;
  refreshError: string | null;
  refreshedNow: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  details?: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
