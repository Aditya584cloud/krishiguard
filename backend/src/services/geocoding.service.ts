interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country_code: string;
  admin1?: string;
  admin2?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: GeocodingResult[];
}

const MAX_ATTEMPTS = 2;

async function fetchGeocodingResults(
  url: URL,
): Promise<OpenMeteoGeocodingResponse | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error(`Geocoding API failed with status ${response.status}`);
        return null;
      }

      return (await response.json()) as OpenMeteoGeocodingResponse;
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `Geocoding request failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying:`,
          error,
        );
        continue;
      }
      console.warn(
        `Geocoding unavailable after ${MAX_ATTEMPTS} attempts. Continuing without coordinates.`,
        error,
      );
      return null;
    }
  }
  return null;
}

export async function geocodeLocation(
  village: string,
  district: string,
  state: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

  url.searchParams.set("name", village);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("countryCode", "IN");

  const data = await fetchGeocodingResults(url);

  if (!data?.results || data.results.length === 0) {
    console.warn(`Location could not be geocoded: ${village}, ${district}, ${state}`);
    return null;
  }

  const result = data.results[0];
  if (!result) {
    return null;
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
  };
}
