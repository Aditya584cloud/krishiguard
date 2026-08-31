import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { useApp } from "../context/AppContext";
import { useQuery } from "../hooks/useQuery";
import { getFarmerWeather } from "../api/client";

export function WeatherPage() {
  const { selectedFarmerId } = useApp();
  const weatherQuery = useQuery(
    () => (selectedFarmerId ? getFarmerWeather(selectedFarmerId) : Promise.reject(new Error("No farmer selected"))),
    [selectedFarmerId],
  );

  return (
    <Layout title="Weather" showBack>
      {!selectedFarmerId && <EmptyState title="No farmer selected" description="Select a farmer on the Profile tab." />}

      {weatherQuery.state.status === "loading" && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}

      {weatherQuery.state.status === "error" && (
        <ErrorState
          title="Could not load weather"
          message={weatherQuery.state.message}
          offline={weatherQuery.state.httpStatus === 0}
          onRetry={weatherQuery.refetch}
        />
      )}

      {weatherQuery.state.status === "success" && (
        <>
          <Card title="Current observation" className="mb-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Temperature" value={`${weatherQuery.state.data.weather.temperatureC}°C`} />
              <Stat label="Feels like" value={`${weatherQuery.state.data.weather.apparentTemperatureC}°C`} />
              <Stat label="Humidity" value={`${weatherQuery.state.data.weather.humidityPercent}%`} />
              <Stat label="Wind" value={`${weatherQuery.state.data.weather.windSpeedKmh} km/h`} />
              <Stat label="Rain" value={`${weatherQuery.state.data.weather.rainMm}mm`} />
              <Stat label="Precipitation" value={`${weatherQuery.state.data.weather.precipitationMm}mm`} />
            </div>
          </Card>
          <p className="text-xs text-soil-500">
            Observed at {new Date(weatherQuery.state.data.weather.observedAt).toLocaleString()} for{" "}
            {weatherQuery.state.data.farmer.village}, {weatherQuery.state.data.farmer.district}
          </p>
        </>
      )}
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sky-50 py-2 text-center">
      <p className="text-[10px] uppercase text-sky-600">{label}</p>
      <p className="text-base font-semibold text-soil-800">{value}</p>
    </div>
  );
}
