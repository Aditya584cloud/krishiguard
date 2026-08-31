// Talks to the exact same KrishiGuard backend the web app uses — same
// endpoints, same request/response shapes, zero duplicated business logic.
// All ML/distress/market/advisory/weather computation stays server-side;
// this file only does HTTP plumbing plus mobile-appropriate error handling
// (timeouts, unreachable-network) so failures never surface a raw
// stack trace to the farmer.

import type {
  AdvisoryResult,
  ApiFailure,
  ApiResult,
  CreateFarmerInput,
  DistressResult,
  Farmer,
  FarmerAnalysisResult,
  FarmerWeather,
  MarketResult,
  WeatherData,
} from "./types";

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://10.0.2.2:8000";

const REQUEST_TIMEOUT_MS = 15_000;

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The server took too long to respond. Please try again.", 0);
    }
    throw new ApiError(
      "Could not reach the KrishiGuard server. Check your internet connection and try again.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }

  let body: ApiResult<T> | undefined;

  try {
    body = (await response.json()) as ApiResult<T>;
  } catch {
    body = undefined;
  }

  if (!response.ok || !body || body.success === false) {
    const message =
      body && "error" in body ? body.error : `Request failed with status ${response.status}`;
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
 * The farmer's persisted, coherent Market + Advisory + Distress snapshot —
 * the same 6-hour-freshness endpoint the web app uses, so mobile and web
 * always agree on what's "current" for a farmer (no separate mobile timer).
 */
export function getFarmerAnalysis(id: string): Promise<FarmerAnalysisResult> {
  return request(`/api/farmers/${encodeURIComponent(id)}/analysis`);
}

export function getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  return request(`/api/weather?${params.toString()}`);
}

export function getAdvisory(input: { farmerId: string; crop?: string; soil?: string }): Promise<AdvisoryResult> {
  return request("/api/advisory", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDistressRisk(input: { farmerId: string }): Promise<DistressResult> {
  return request("/api/distress", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getMarketComparison(input: { farmerId: string; crop?: string }): Promise<MarketResult> {
  return request("/api/market", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
