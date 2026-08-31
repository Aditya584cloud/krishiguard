import { useCallback } from "react";
import { getFarmerWeather } from "../api/client";
import { useApp } from "../context/AppContext";
import { useQuery } from "../hooks/useQuery";
import { Badge } from "../components/Badge";
import { Card, Stat } from "../components/Card";
import { EmptyState, ErrorState, SkeletonCard } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import {
  CloudRain,
  Droplet,
  Thermometer,
  Wind,
} from "../components/icons";

function weatherCodeLabel(code: number): string {
  // Open-Meteo WMO weather codes — labels only, no data invented.
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([71, 73, 75].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return `Code ${code}`;
}

export function WeatherPage() {
  const { selectedFarmerId } = useApp();
  const fetchWeather = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerWeather(selectedFarmerId);
  }, [selectedFarmerId]);

  const { state, refetch } = useQuery(fetchWeather, [selectedFarmerId]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Weather"
        description="Live conditions from Open-Meteo for the farmer's registered location."
        icon={<CloudRain className="h-5 w-5" />}
      />

      {!selectedFarmerId ? (
        <Card title="Current weather">
          <EmptyState
            title="No farmer selected"
            description="Select a farmer from the top bar to see their current weather."
          />
        </Card>
      ) : (
        <Card title="Current weather">
          {state.status === "loading" && <SkeletonCard />}

          {state.status === "error" && state.httpStatus === 422 && (
            <EmptyState title="Location not available" description={state.message} />
          )}

          {state.status === "error" && state.httpStatus !== 422 && (
            <ErrorState title="Weather data unavailable" message={state.message} onRetry={refetch} />
          )}

          {state.status === "success" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-soil-600">
                  For <span className="font-medium text-soil-800">{state.data.farmer.name}</span> —{" "}
                  {state.data.farmer.village}, {state.data.farmer.district}
                </p>
                <Badge tone="sky">Current observation, not a forecast</Badge>
              </div>

              <div className="flex items-center gap-4 rounded-lg bg-soil-50 p-4">
                <Thermometer className="h-10 w-10 shrink-0 text-leaf-600" />
                <div>
                  <p className="text-4xl font-bold leading-none text-soil-900">
                    {state.data.weather.temperatureC}°C
                  </p>
                  <p className="mt-1 text-sm text-soil-600">
                    Feels like {state.data.weather.apparentTemperatureC}°C ·{" "}
                    {weatherCodeLabel(state.data.weather.weatherCode)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat
                  label="Humidity"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Droplet className="h-4 w-4 text-sky-600" />
                      {state.data.weather.humidityPercent}%
                    </span>
                  }
                />
                <Stat
                  label="Rain"
                  value={
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="h-4 w-4 text-sky-600" />
                      {state.data.weather.rainMm} mm
                    </span>
                  }
                />
                <Stat label="Precipitation" value={`${state.data.weather.precipitationMm} mm`} />
                <Stat
                  label="Wind speed"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Wind className="h-4 w-4 text-soil-500" />
                      {state.data.weather.windSpeedKmh} km/h
                    </span>
                  }
                />
                <Stat label="Observed at" value={new Date(state.data.weather.observedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })} />
              </div>

              <p className="text-xs text-soil-500">
                Source: Open-Meteo. This reflects the most recent observation for this location —
                it is not a multi-day forecast.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
