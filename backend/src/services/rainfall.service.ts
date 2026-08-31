
export interface RainfallSignal {
  observedMm: number;
  baselineMm: number;
  deviationPercent: number;
  windowDays: number;
  source: "OPEN_METEO_HISTORICAL" | "DEMO_BASELINE_FALLBACK";
  baselineYearsUsed: number;
}

const WINDOW_DAYS = 14;
const BASELINE_YEARS = 3;

const DEMO_BASELINE_MM = 45;

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function fetchDailyPrecipSum(url: URL): Promise<number | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      daily?: { precipitation_sum?: (number | null)[] };
    };
    const values = data.daily?.precipitation_sum;
    if (!values || values.length === 0) return null;

    const valid = values.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    if (valid.length === 0) return null;

    return valid.reduce((sum, v) => sum + v, 0);
  } catch {
    return null;
  }
}

async function getObservedRainfallMm(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("past_days", String(WINDOW_DAYS));
  url.searchParams.set("forecast_days", "0");
  url.searchParams.set("timezone", "auto");

  return fetchDailyPrecipSum(url);
}

async function getHistoricalRainfallMm(
  latitude: number,
  longitude: number,
  yearsAgo: number,
): Promise<number | null> {
  // Same 14-day calendar window (ending yesterday), shifted back N years.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));

  end.setUTCFullYear(end.getUTCFullYear() - yearsAgo);
  start.setUTCFullYear(start.getUTCFullYear() - yearsAgo);

  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", toISODate(start));
  url.searchParams.set("end_date", toISODate(end));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("timezone", "auto");

  return fetchDailyPrecipSum(url);
}

export async function getRainfallSignal(
  latitude: number,
  longitude: number,
): Promise<RainfallSignal> {
  const [observed, ...historicals] = await Promise.all([
    getObservedRainfallMm(latitude, longitude),
    ...Array.from({ length: BASELINE_YEARS }, (_, i) =>
      getHistoricalRainfallMm(latitude, longitude, i + 1),
    ),
  ]);

  const validHistoricals = historicals.filter(
    (v): v is number => v !== null,
  );

  if (observed === null || validHistoricals.length === 0) {
    const fallbackObserved = observed ?? DEMO_BASELINE_MM;
    return {
      observedMm: round1(fallbackObserved),
      baselineMm: DEMO_BASELINE_MM,
      deviationPercent: 0,
      windowDays: WINDOW_DAYS,
      source: "DEMO_BASELINE_FALLBACK",
      baselineYearsUsed: 0,
    };
  }

  const baselineMm =
    validHistoricals.reduce((sum, v) => sum + v, 0) / validHistoricals.length;

  const deviationPercent =
    baselineMm > 0
      ? round1(((observed - baselineMm) / baselineMm) * 100)
      : observed > 0
        ? 100
        : 0;

  return {
    observedMm: round1(observed),
    baselineMm: round1(baselineMm),
    deviationPercent,
    windowDays: WINDOW_DAYS,
    source: "OPEN_METEO_HISTORICAL",
    baselineYearsUsed: validHistoricals.length,
  };
}
