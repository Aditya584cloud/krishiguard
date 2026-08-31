import { useCallback } from "react";
import { getAdvisory, getFarmerAnalysis, getFarmerById } from "../api/client";
import type { AdvisoryResult } from "../api/types";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, Stat } from "../components/Card";
import { EmptyState, ErrorState, Skeleton, SkeletonCard } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { CloudRain, Sprout, Thermometer } from "../components/icons";

export function AdvisoryPage() {
  const { selectedFarmerId, recordAdvisory } = useApp();
  const [state, run] = useMutation(getAdvisory);

  const fetchFarmer = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerById(selectedFarmerId);
  }, [selectedFarmerId]);
  const farmerQuery = useQuery(fetchFarmer, [selectedFarmerId]);

  // Auto-loaded, persisted snapshot (6-hour freshness window) — shown by
  // default so revisiting this page never requires a manual click. "Get
  // advisory" still runs an on-demand generation that overrides the view
  // for this session, independent of that snapshot.
  const fetchAnalysis = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerAnalysis(selectedFarmerId);
  }, [selectedFarmerId]);
  const analysisQuery = useQuery(fetchAnalysis, [selectedFarmerId]);
  const snapshot = analysisQuery.state.status === "success" ? analysisQuery.state.data : null;

  const handleGenerate = async () => {
    if (!selectedFarmerId) return;
    const result = await run({ farmerId: selectedFarmerId });
    if (result) recordAdvisory(selectedFarmerId, result);
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Crop advisory"
        description="Rule-based recommendations from this farmer's crop, soil type and current weather."
        icon={<Sprout className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card title="Generate advisory">
          {!selectedFarmerId ? (
            <EmptyState
              title="No farmer selected"
              description="Select a farmer from the top bar first."
            />
          ) : (
            <div className="space-y-4">
              {farmerQuery.state.status === "loading" && <Skeleton lines={3} />}
              {farmerQuery.state.status === "error" && (
                <ErrorState
                  title="Farmer profile unavailable"
                  message={farmerQuery.state.message}
                  onRetry={farmerQuery.refetch}
                />
              )}
              {farmerQuery.state.status === "success" && (
                <div className="space-y-2 text-sm">
                  <p className="text-soil-600">
                    Advisory is generated from this farmer's stored profile and current weather,
                    and kept fresh for 6 hours — no crop or soil re-entry needed.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="leaf">Crop: {farmerQuery.state.data.primaryCrop}</Badge>
                    <Badge tone="neutral">Soil: {farmerQuery.state.data.soilType}</Badge>
                    <Badge tone="sky">{farmerQuery.state.data.language}</Badge>
                  </div>
                </div>
              )}
              <FreshnessBadge
                lastSuccessAt={snapshot?.lastSuccessAt ?? null}
                refreshFailed={snapshot?.refreshFailed ?? false}
                refreshing={analysisQuery.state.status === "loading"}
                onRetry={analysisQuery.refetch}
              />

              <Button
                onClick={handleGenerate}
                loading={state.status === "loading"}
                loadingLabel="Generating…"
                variant={snapshot?.advisory ? "secondary" : "primary"}
                disabled={farmerQuery.state.status !== "success"}
                fullWidth
              >
                {snapshot?.advisory ? "Regenerate now" : "Get advisory"}
              </Button>
            </div>
          )}
        </Card>

        <Card title="Advisory">
          {state.status === "loading" && <SkeletonCard />}
          {state.status === "error" && (
            <ErrorState
              title="Advisory unavailable"
              message={state.message ?? "Unable to generate advisory."}
            />
          )}
          {state.status === "success" && state.data && <AdvisoryResultView result={state.data} />}
          {state.status === "idle" && (
            <>
              {analysisQuery.state.status === "loading" && <SkeletonCard />}
              {analysisQuery.state.status === "error" && (
                <ErrorState
                  title="Advisory unavailable"
                  message={analysisQuery.state.message}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot && !snapshot.advisory && (
                <ErrorState
                  title="Advisory not generated yet"
                  message={snapshot.refreshError ?? "The first advisory attempt for this farmer hasn't succeeded yet."}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot?.advisory && <AdvisoryResultView result={snapshot.advisory} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function AdvisoryResultView({ result }: { result: AdvisoryResult }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-soil-600">
        <span>
          For <span className="font-medium text-soil-800">{result.farmer.name}</span> —{" "}
          {result.farmer.village}, {result.farmer.district}
        </span>
        <Badge tone="sky">{result.language}</Badge>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-soil-500">
          Current situation
        </h3>
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-soil-50 p-4">
          <span className="flex items-center gap-1.5 text-sm font-medium text-soil-800">
            <Sprout className="h-4 w-4 text-leaf-600" /> {result.crop}
          </span>
          <span className="text-sm text-soil-600">{result.soil} soil</span>
          <span className="h-4 w-px bg-soil-200" aria-hidden="true" />
          <Stat
            label="Temp"
            value={
              <span className="flex items-center gap-1 text-base">
                <Thermometer className="h-3.5 w-3.5 text-soil-500" />
                {result.weather.temperatureC}°C
              </span>
            }
          />
          <Stat label="Humidity" value={`${result.weather.humidityPercent}%`} />
          <Stat
            label="Rain"
            value={
              <span className="flex items-center gap-1 text-base">
                <CloudRain className="h-3.5 w-3.5 text-sky-600" />
                {result.weather.rainMm} mm
              </span>
            }
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-soil-500">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-leaf-200 bg-leaf-50 p-3 text-sm text-soil-800"
            >
              <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-leaf-600" />
              {rec}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-soil-500">
          Based on {result.crop}'s current weather conditions and this farmer's{" "}
          {result.soil.toLowerCase()} soil.
        </p>
      </div>
    </div>
  );
}
