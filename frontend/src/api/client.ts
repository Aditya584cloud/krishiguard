import type {
  AdvisoryInput,
  AdvisoryResult,
  ApiFailure,
  ApiResult,
  CreateFarmerInput,
  DistressInput,
  DistressResult,
  Farmer,
  FarmerAnalysisResult,
  FarmerWeather,
  MarketInput,
  MarketResult,
  WeatherData,
} from "./types";

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8000";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiFailure["details"];

  constructor(message: string, status: number, details?: ApiFailure["details"]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }
  catch {
    throw new ApiError(
      "Unable to reach the KrishiGuard server. Check your connection and try again.",
      0,
    );
  }

  let body: ApiResult<T> | undefined;

  try {
    body = (await response.json()) as ApiResult<T>;
  }
  catch {
    body = undefined;
  }

  if (!response.ok || !body || body.success === false) {
    const message =
      body && "error" in body
        ? body.error
        : `Request failed with status ${response.status}`;
    const details = body && "details" in body ? body.details : undefined;

    throw new ApiError(message, response.status, details);
  }

  return body.data;
}

export function getHealth(): Promise<{ status: string; service: string }> {
  return request("/health");
}

export function createFarmer(input: CreateFarmerInput): Promise<Farmer> {
  return request("/api/farmers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getFarmers(): Promise<Farmer[]> {
  return request("/api/farmers");
}

export function getFarmerById(id: string): Promise<Farmer> {
  return request(`/api/farmers/${encodeURIComponent(id)}`);
}

export function getFarmerWeather(id: string): Promise<FarmerWeather> {
  return request(`/api/farmers/${encodeURIComponent(id)}/weather`);
}

/**
 * Returns the farmer's persisted, coherent Market + Advisory + Distress
 * snapshot — auto-refreshed server-side if it's missing or 6+ hours stale.
 * This is what lets pages show a farmer's current analysis on revisit
 * without a manual "Check" click.
 */
export function getFarmerAnalysis(id: string): Promise<FarmerAnalysisResult> {
  return request(`/api/farmers/${encodeURIComponent(id)}/analysis`);
}

export function getWeatherByCoordinates(
  lat: number,
  lon: number,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });

  return request(`/api/weather?${params.toString()}`);
}

export function getAdvisory(input: AdvisoryInput): Promise<AdvisoryResult> {
  return request("/api/advisory", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDistressRisk(input: DistressInput): Promise<DistressResult> {
  return request("/api/distress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMarketComparison(input: MarketInput): Promise<MarketResult> {
  return request("/api/market", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
