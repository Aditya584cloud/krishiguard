import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getFarmerAnalysis, getFarmerById, getMarketComparison } from "../api/client";
import type { MarketResult } from "../api/types";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, Stat } from "../components/Card";
import { EmptyState, ErrorState, SkeletonCard } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { formatINR } from "../lib/format";
import { Info, MapPin, Store, TrendingDown, TrendingUp } from "../components/icons";

function scopeLabel(result: MarketResult): string {
  switch (result.scope) {
    case "DISTRICT":
      return `${result.farmer.district} Markets`;
    case "STATE":
      return `Other ${result.farmer.state} Markets`;
    case "OTHER_MARKETS":
      return "Other Market References";
    case "NO_DATA":
      return "No data available";
  }
}

function scopeTone(result: MarketResult): "leaf" | "wheat" | "neutral" {
  if (result.scope === "DISTRICT") return "leaf";
  if (result.scope === "STATE") return "wheat";
  return "neutral";
}

export function MarketPage() {
  const { selectedFarmerId, recordMarket } = useApp();
  const [crop, setCrop] = useState("");
  const [state, run] = useMutation(getMarketComparison);

  const fetchFarmer = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerById(selectedFarmerId);
  }, [selectedFarmerId]);
  const farmerQuery = useQuery(fetchFarmer, [selectedFarmerId]);

  useEffect(() => {
    if (farmerQuery.state.status === "success") {
      setCrop(farmerQuery.state.data.primaryCrop);
    }
  }, [farmerQuery.state]);

  // Auto-loaded, persisted snapshot (6-hour freshness window) for the
  // farmer's primary crop — shown by default so revisiting this page never
  // requires a manual click. Checking a different crop, or clicking "Check
  // prices" again, runs an on-demand query that overrides the view for this
  // session without touching the persisted snapshot.
  const fetchAnalysis = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerAnalysis(selectedFarmerId);
  }, [selectedFarmerId]);
  const analysisQuery = useQuery(fetchAnalysis, [selectedFarmerId]);
  const snapshot = analysisQuery.state.status === "success" ? analysisQuery.state.data : null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFarmerId || crop.trim().length < 2) return;

    const result = await run({ farmerId: selectedFarmerId, crop: crop.trim() });
    if (result) recordMarket(selectedFarmerId, result);
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Market prices"
        description="Government mandi (data.gov.in) prices, synchronized periodically into KrishiGuard."
        icon={<Store className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card title="Check mandi prices">
          {!selectedFarmerId ? (
            <EmptyState
              title="No farmer selected"
              description="Select a farmer from the top bar first."
            />
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {farmerQuery.state.status === "loading" && (
                <p className="text-sm text-soil-500">Loading farmer's registered crop…</p>
              )}
              <div>
                <label htmlFor="market-crop" className="mb-1 block text-sm font-medium text-soil-700">
                  Crop
                </label>
                <input
                  id="market-crop"
                  type="text"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="e.g. Onion"
                  className="w-full rounded-md border border-soil-200 px-3 py-2 text-sm focus:border-leaf-500 focus:outline-none focus:ring-1 focus:ring-leaf-500"
                />
                {crop.length > 0 && crop.trim().length < 2 && (
                  <p className="mt-1 text-sm text-danger-600">Crop must be at least 2 characters.</p>
                )}
                <p className="mt-1 text-xs text-soil-500">
                  Pre-filled from the farmer's registered primary crop — change it to check a
                  different crop.
                </p>
              </div>
              {(analysisQuery.state.status === "loading" ||
                (snapshot?.market && crop.trim() === snapshot.market.crop)) && (
                <FreshnessBadge
                  lastSuccessAt={snapshot?.lastSuccessAt ?? null}
                  refreshFailed={snapshot?.refreshFailed ?? false}
                  refreshing={analysisQuery.state.status === "loading"}
                  onRetry={analysisQuery.refetch}
                />
              )}
              <Button type="submit" loading={state.status === "loading"} loadingLabel="Checking…" fullWidth disabled={crop.trim().length < 2}>
                Check prices
              </Button>
            </form>
          )}
        </Card>

        <Card title="Mandi prices">
          {state.status === "loading" && <SkeletonCard />}
          {state.status === "error" && (
            <ErrorState
              title="Market data temporarily unavailable"
              message={state.message ?? "Unable to fetch market data. You can still browse other pages while this recovers."}
            />
          )}
          {state.status === "success" && state.data && <MarketResultView result={state.data} />}
          {state.status === "idle" && (
            <>
              {analysisQuery.state.status === "loading" && <SkeletonCard />}
              {analysisQuery.state.status === "error" && (
                <ErrorState
                  title="Market data temporarily unavailable"
                  message={analysisQuery.state.message}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot && !snapshot.market && (
                <ErrorState
                  title="Market data not generated yet"
                  message={snapshot.refreshError ?? "The first market lookup for this farmer hasn't succeeded yet."}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot?.market && <MarketResultView result={snapshot.market} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MarketResultView({ result }: { result: MarketResult }) {
  const showStateColumn = result.scope === "OTHER_MARKETS";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={scopeTone(result)}>
          <MapPin className="h-3 w-3" /> {scopeLabel(result)}
        </Badge>
        <span className="text-sm text-soil-600">
          for {result.farmer.name} · {result.crop}
        </span>
      </div>

      <p className="text-sm text-soil-700">{result.message}</p>

      {result.scope === "OTHER_MARKETS" && (
        <div className="flex items-start gap-2 rounded-lg border border-wheat-400 bg-wheat-50 p-3 text-xs text-wheat-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            These are real prices from markets outside {result.farmer.state} — not this farmer's
            local price, and not used as a price-change signal for distress.
          </p>
        </div>
      )}

      {result.scope === "NO_DATA" ? (
        <EmptyState
          title="No mandi prices found"
          description="Try a different crop, or check back later — mandi data is synchronized periodically."
        />
      ) : (
        <>
          {result.comparison && (
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-soil-50 p-4">
              <Stat
                label="Highest"
                value={<span className="text-leaf-700">{formatINR(result.comparison.highestPrice)}</span>}
                hint={result.comparison.highestPriceMarket}
              />
              <Stat
                label="Lowest"
                value={<span className="text-danger-600">{formatINR(result.comparison.lowestPrice)}</span>}
                hint={result.comparison.lowestPriceMarket}
              />
              <Stat label="Average" value={formatINR(Math.round(result.comparison.averagePrice))} />
            </div>
          )}

          {result.priceChangePercent !== null ? (
            <div className="flex items-center gap-2 rounded-lg border border-soil-100 bg-white p-3 text-sm">
              {result.priceChangePercent >= 0 ? (
                <TrendingUp className="h-4 w-4 shrink-0 text-leaf-600" />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0 text-danger-600" />
              )}
              <div>
                <p className="font-medium text-soil-800">
                  Price change: {result.priceChangePercent > 0 ? "+" : ""}
                  {result.priceChangePercent}%
                </p>
                <p className="mt-0.5 text-xs text-soil-600">{result.priceChangeBasis}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-soil-500">
              {result.scope === "OTHER_MARKETS"
                ? "Price change isn't shown for markets outside the farmer's state."
                : "Not enough date spread in the synchronized mandi records to derive a price-change signal yet."}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-soil-100">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-soil-100 bg-soil-50 text-soil-600">
                  {showStateColumn && <th className="py-2 px-3 font-medium">State</th>}
                  <th className="py-2 px-3 font-medium">Market</th>
                  <th className="py-2 px-3 font-medium">District</th>
                  <th className="py-2 px-3 font-medium">Arrival date</th>
                  <th className="py-2 px-3 text-right font-medium">Modal price</th>
                </tr>
              </thead>
              <tbody>
                {result.markets.map((m, i) => (
                  <tr key={`${m.market}-${i}`} className="border-b border-soil-100 odd:bg-white even:bg-soil-50/60 last:border-0">
                    {showStateColumn && <td className="py-2 px-3 text-soil-600">{m.state}</td>}
                    <td className="py-2 px-3 font-medium text-soil-800">{m.market}</td>
                    <td className="py-2 px-3 text-soil-600">{m.district}</td>
                    <td className="py-2 px-3 text-soil-600">{m.arrivalDate}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-soil-800">{formatINR(m.modalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-soil-400">
            <Info className="h-3 w-3" />
            Source: government mandi data (data.gov.in), synchronized into KrishiGuard periodically —
            not a live feed for every request.
          </p>
        </>
      )}
    </div>
  );
}
