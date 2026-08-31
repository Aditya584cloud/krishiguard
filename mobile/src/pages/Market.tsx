import { useState } from "react";
import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { getFarmerAnalysis, getMarketComparison } from "../api/client";
import { formatINR } from "../lib/format";
import type { MarketResult, MarketScope } from "../api/types";

const SCOPE_LABEL: Record<MarketScope, string> = {
  DISTRICT: "District markets",
  STATE: "Other markets in state",
  OTHER_MARKETS: "Other market references",
  NO_DATA: "No data available",
};

export function MarketPage() {
  const { selectedFarmerId } = useApp();
  const [crop, setCrop] = useState("");
  const analysisQuery = useQuery(
    () => (selectedFarmerId ? getFarmerAnalysis(selectedFarmerId) : Promise.reject(new Error("No farmer selected"))),
    [selectedFarmerId],
  );
  const [mutation, runCheck] = useMutation(getMarketComparison);

  if (!selectedFarmerId) {
    return (
      <Layout title="Market">
        <EmptyState title="No farmer selected" description="Select a farmer on the Profile tab." />
      </Layout>
    );
  }

  const snapshot =
    mutation.status === "success" && mutation.data
      ? mutation.data
      : analysisQuery.state.status === "success"
        ? analysisQuery.state.data.market
        : null;

  return (
    <Layout title="Market prices">
      <Card className="mb-3">
        <div className="flex gap-2">
          <input
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder="Crop (defaults to registered crop)"
            className="min-w-0 flex-1 rounded-lg border border-soil-200 px-3 py-2 text-sm focus:border-leaf-500 focus:outline-none"
          />
          <Button
            loading={mutation.status === "loading"}
            loadingLabel="Checking…"
            onClick={() => runCheck({ farmerId: selectedFarmerId, crop: crop.trim() || undefined })}
          >
            Check
          </Button>
        </div>
      </Card>

      {mutation.status === "error" && (
        <ErrorState title="Could not check prices" message={mutation.message ?? "Unknown error"} className="mb-3" onRetry={() => runCheck({ farmerId: selectedFarmerId, crop: crop.trim() || undefined })} />
      )}

      {analysisQuery.state.status === "loading" && mutation.status === "idle" && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}

      {analysisQuery.state.status === "success" && mutation.status === "idle" && (
        <div className="mb-3">
          <FreshnessBadge
            lastSuccessAt={analysisQuery.state.data.lastSuccessAt}
            refreshFailed={analysisQuery.state.data.refreshFailed}
          />
        </div>
      )}

      {snapshot ? (
        <MarketResultView result={snapshot} />
      ) : (
        analysisQuery.state.status !== "loading" &&
        mutation.status === "idle" && (
          <EmptyState title="No market check yet" description="Tap Check to fetch mandi prices." />
        )
      )}
    </Layout>
  );
}

function MarketResultView({ result }: { result: MarketResult }) {
  return (
    <Card
      title={`for ${result.farmer.name}`}
      action={<Badge tone={result.scope === "NO_DATA" ? "danger" : result.scope === "DISTRICT" ? "leaf" : "wheat"}>{SCOPE_LABEL[result.scope]}</Badge>}
    >
      <p className="mb-3 text-sm text-soil-600">{result.message}</p>

      {result.comparison && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Low" value={formatINR(result.comparison.lowestPrice)} />
          <Stat label="Avg" value={formatINR(result.comparison.averagePrice)} />
          <Stat label="High" value={formatINR(result.comparison.highestPrice)} />
        </div>
      )}

      {result.priceChangePercent !== null && (
        <p className="mb-3 text-xs text-soil-500">
          {result.priceChangePercent > 0 ? "+" : ""}
          {result.priceChangePercent}% {result.priceChangeBasis}
        </p>
      )}

      {result.markets.length > 0 ? (
        <ul className="space-y-2">
          {result.markets.slice(0, 8).map((m, i) => (
            <li key={i} className="rounded-lg border border-soil-100 p-2 text-sm">
              <p className="font-medium text-soil-800">{m.market}, {m.district}</p>
              <p className="text-xs text-soil-500">{m.commodity} · {m.arrivalDate}</p>
              <p className="mt-0.5 text-soil-700">{formatINR(m.modalPrice)} (₹{m.minPrice}–{m.maxPrice})</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No mandi prices found" />
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-soil-50 py-2">
      <p className="text-[10px] uppercase text-soil-500">{label}</p>
      <p className="text-sm font-semibold text-soil-800">{value}</p>
    </div>
  );
}
