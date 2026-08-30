import type { WeatherData } from "../types/weather.js";
import { prisma } from "../lib/prisma.js";

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {

  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());

  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "wind_speed_10m",
      "weather_code",
    ].join(","),
  );

  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(
      `Weather API failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as OpenMeteoResponse;

  if (!data.current) {
    throw new Error("Weather API returned an unexpected response");
  }

  const weather: WeatherData = {
      latitude: data.latitude,
      longitude: data.longitude,

      temperatureC: data.current.temperature_2m,
      apparentTemperatureC: data.current.apparent_temperature,

      humidityPercent: data.current.relative_humidity_2m,

      precipitationMm: data.current.precipitation,
      rainMm: data.current.rain,

      windSpeedKmh: data.current.wind_speed_10m,

      weatherCode: data.current.weather_code,

      observedAt: data.current.time,
    };

  try {
    await prisma.weatherObservation.create({
      data: {
        latitude: weather.latitude,
        longitude: weather.longitude,

        temperatureC: weather.temperatureC,
        apparentTemperatureC: weather.apparentTemperatureC,

        humidityPercent: weather.humidityPercent,

        precipitationMm: weather.precipitationMm,
        rainMm: weather.rainMm,

        windSpeedKmh: weather.windSpeedKmh,

        weatherCode: weather.weatherCode,

        observedAt: new Date(weather.observedAt),
      },
    });
  }
  catch (error) {
    console.error("Failed to log weather observation:", error);
  }

  return weather;
}
