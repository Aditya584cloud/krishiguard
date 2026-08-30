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

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(
        `Geocoding API failed with status ${response.status}`,
      );
      return null;
    }

    const data = (await response.json()) as OpenMeteoGeocodingResponse;

    if (!data.results || data.results.length === 0) {
      console.warn(
        `Location could not be geocoded: ${village}, ${district}, ${state}`,
      );
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
  catch (error) {
    console.warn(
      `Geocoding unavailable for ${village}, ${district}, ${state}. Continuing without coordinates.`,
      error,
    );

    return null;
  }
}