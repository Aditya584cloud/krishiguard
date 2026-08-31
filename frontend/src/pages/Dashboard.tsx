import { useCallback } from "react";
import { getFarmerAnalysis, getFarmerById, getFarmerWeather } from "../api/client";
import { useApp } from "../context/AppContext";
import { useQuery } from "../hooks/useQuery";
import { Badge } from "../components/Badge";
import { Card, Stat } from "../components/Card";
import { EmptyState, ErrorState, Skeleton, SkeletonCard } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import { RiskPill } from "../components/RiskDisplay";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { formatINR } from "../lib/format";
import {
  Banknote,
  Calendar,
  CloudRain,
  LayoutGrid,
  MapPin,
  ShieldAlert,
  Sprout,
  Store,
  Thermometer,
} from "../components/icons";

export function DashboardPage() {
  const { selectedFarmerId } = useApp();

  const fetchFarmer = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerById(selectedFarmerId);
  }, [selectedFarmerId]);
  const farmerQuery = useQuery(fetchFarmer, [selectedFarmerId]);

  const fetchWeather = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerWeather(selectedFarmerId);
  }, [selectedFarmerId]);
  const weatherQuery = useQuery(fetchWeather, [selectedFarmerId]);

  // Market + Advisory + Distress: a single persisted, coherent snapshot,
  // auto-refreshed server-side on a 6-hour freshness window — no manual
  // "Check" click needed on revisit. See FreshnessBadge for the timestamp.
  const fetchAnalysis = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerAnalysis(selectedFarmerId);
  }, [selectedFarmerId]);
  const analysisQuery = useQuery(fetchAnalysis, [selectedFarmerId]);

  if (!selectedFarmerId) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="A complete view of a farmer's environment, market and risk status."
          icon={<LayoutGrid className="h-5 w-5" />}
        />
        <EmptyState
          title="No farmer selected"
          description="Select a farmer from the top bar, or register a new one, to see their dashboard."
        />
      </>
    );
  }

  const farmer = farmerQuery.state.status === "success" ? farmerQuery.state.data : null;
  const analysis = analysisQuery.state.status === "success" ? analysisQuery.state.data : null;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Dashboard"
        description={
          farmer
            ? `Current situation for ${farmer.name}`
            : "A complete view of a farmer's environment, market and risk status."
        }
        icon={<LayoutGrid className="h-5 w-5" />}
        action={
          selectedFarmerId && (
            <FreshnessBadge
              lastSuccessAt={analysis?.lastSuccessAt ?? null}
              refreshFailed={analysis?.refreshFailed ?? false}
              refreshing={analysisQuery.state.status === "loading"}
              onRetry={analysisQuery.refetch}
            />
          )
        }
      />

      {/* Farmer identity — always shown first, per the decision-support workflow. */}
      <section className="mb-6 rounded-xl border border-soil-100 bg-white p-5 shadow-sm">
        {farmerQuery.state.status === "loading" && <Skeleton lines={3} />}
        {farmerQuery.state.status === "error" && (
          <ErrorState
            title="Farmer profile unavailable"
            message={farmerQuery.state.message}
            onRetry={farmerQuery.refetch}
          />
        )}
        {farmer && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-semibold text-soil-900">{farmer.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-soil-600">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {farmer.village}, {farmer.district}, {farmer.state}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="sky">{farmer.language}</Badge>
              <Badge tone="leaf">
                <Sprout className="h-3 w-3" /> {farmer.primaryCrop}
              </Badge>
              <Badge tone="neutral">{farmer.soilType} soil</Badge>
              {farmer.hasActiveLoan && (
                <Badge tone="wheat">
                  <Banknote className="h-3 w-3" /> Loan (demo)
                </Badge>
              )}
            </div>
          </div>
        )}
      </section>

      {analysisQuery.state.status === "error" && (
        <div className="mb-6">
          <ErrorState
            title="Analysis unavailable"
            message={analysisQuery.state.message}
            onRetry={analysisQuery.refetch}
          />
        </div>
      )}

      {analysisQuery.state.status === "loading" && (
        <div className="mb-6 grid gap-6 md:grid-cols-3">
          <Card title="Market" icon={<Store className="h-4 w-4" />}>
            <SkeletonCard />
          </Card>
          <Card title="Distress risk" icon={<ShieldAlert className="h-4 w-4" />}>
            <SkeletonCard />
          </Card>
          <Card title="Advisory" icon={<Sprout className="h-4 w-4" />}>
            <SkeletonCard />
          </Card>
        </div>
      )}

      {analysis && !analysis.market && !analysis.advisory && !analysis.distress && (
        <div className="mb-6">
          <ErrorState
            title="Analysis could not be generated yet"
            message={analysis.refreshError ?? "The first analysis attempt for this farmer hasn't succeeded yet."}
            onRetry={analysisQuery.refetch}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Weather" icon={<CloudRain className="h-4 w-4" />} action={{ label: "Details", to: "/weather" }}>
          {weatherQuery.state.status === "loading" && <SkeletonCard />}
          {weatherQuery.state.status === "error" && weatherQuery.state.httpStatus === 422 && (
            <EmptyState title="Location not available" description={weatherQuery.state.message} />
          )}
          {weatherQuery.state.status === "error" && weatherQuery.state.httpStatus !== 422 && (
            <ErrorState
              title="Weather data unavailable"
              message={weatherQuery.state.message}
              onRetry={weatherQuery.refetch}
            />
          )}
          {weatherQuery.state.status === "success" && (
            <div className="space-y-3">
              <Stat
                label="Temperature"
                value={
                  <span className="flex items-center gap-1.5 text-2xl">
                    <Thermometer className="h-4 w-4 text-soil-500" />
                    {weatherQuery.state.data.weather.temperatureC}°C
                  </span>
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Humidity" value={`${weatherQuery.state.data.weather.humidityPercent}%`} />
                <Stat label="Rain" value={`${weatherQuery.state.data.weather.rainMm} mm`} />
                <Stat label="Wind" value={`${weatherQuery.state.data.weather.windSpeedKmh} km/h`} />
              </div>
            </div>
          )}
        </Card>

        {analysis?.market && (
          <Card title="Market" icon={<Store className="h-4 w-4" />} action={{ label: "Check prices", to: "/market" }}>
            {analysis.market.scope === "NO_DATA" ? (
              <EmptyState title="No data available" description={analysis.market.message} />
            ) : (
              <div className="space-y-3">
                <Badge
                  tone={
                    analysis.market.scope === "DISTRICT" ? "leaf" : analysis.market.scope === "STATE" ? "wheat" : "neutral"
                  }
                >
                  {analysis.market.scope === "DISTRICT"
                    ? `${analysis.market.farmer.district} markets`
                    : analysis.market.scope === "STATE"
                      ? `Other ${analysis.market.farmer.state} markets`
                      : "Other markets"}
                </Badge>
                {analysis.market.comparison && (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Highest" value={formatINR(analysis.market.comparison.highestPrice)} />
                    <Stat label="Lowest" value={formatINR(analysis.market.comparison.lowestPrice)} />
                  </div>
                )}
                {analysis.market.priceChangePercent !== null && (
                  <p className="text-sm text-soil-600">
                    Price change: {analysis.market.priceChangePercent > 0 ? "+" : ""}
                    {analysis.market.priceChangePercent}%
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {analysis?.distress && (
          <Card
            title="Distress risk"
            icon={<ShieldAlert className="h-4 w-4" />}
            tone={
              analysis.distress.riskLevel === "HIGH"
                ? "danger"
                : analysis.distress.riskLevel === "MEDIUM"
                  ? "wheat"
                  : "leaf"
            }
            action={{ label: "Full assessment", to: "/distress" }}
          >
            <div className="space-y-3">
              <RiskPill level={analysis.distress.riskLevel} score={analysis.distress.riskScore} />
              <ul className="list-disc space-y-1 pl-5 text-sm text-soil-800">
                {analysis.distress.reasons.slice(0, 2).map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              {analysis.distress.alert?.status === "ROUTED" && (
                <p className="text-sm text-soil-600">Officer routing prepared: {analysis.distress.alert.officer.name}</p>
              )}
              {analysis.distress.alert?.status === "NO_OFFICER_FOUND" && (
                <p className="text-sm text-soil-600">High risk, no officer available for this district.</p>
              )}
            </div>
          </Card>
        )}

        {analysis?.advisory && (
          <Card title="Advisory" icon={<Sprout className="h-4 w-4" />} action={{ label: "Full advisory", to: "/advisory" }}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="sky">{analysis.advisory.language}</Badge>
                <Badge tone="leaf">{analysis.advisory.crop}</Badge>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-soil-800">
                {analysis.advisory.recommendations.slice(0, 2).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </div>

      {farmer?.hasActiveLoan && farmer.loanDueDate && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-soil-500">
          <Calendar className="h-3.5 w-3.5" />
          Demo loan on record, due {new Date(farmer.loanDueDate).toLocaleDateString("en-IN")}.
        </p>
      )}
    </div>
  );
}
