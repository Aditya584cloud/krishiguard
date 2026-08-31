import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { useApp } from "../context/AppContext";
import { useQuery } from "../hooks/useQuery";
import { getFarmerAnalysis } from "../api/client";
import { getCachedAnalysis, setCachedAnalysis } from "../lib/cache";
import { AlertTriangle, ChevronRight, ClipboardList, Cloud, TrendingUp } from "../components/icons";
import type { RiskLevel } from "../api/types";

const RISK_TONE: Record<RiskLevel, "leaf" | "wheat" | "danger"> = {
  LOW: "leaf",
  MEDIUM: "wheat",
  HIGH: "danger",
};

export function DashboardPage() {
  const { selectedFarmerId, selectedFarmer, farmers } = useApp();
  const navigate = useNavigate();
  const analysisQuery = useQuery(
    () => (selectedFarmerId ? getFarmerAnalysis(selectedFarmerId) : Promise.reject(new Error("No farmer selected"))),
    [selectedFarmerId],
  );

  useEffect(() => {
    if (analysisQuery.state.status === "success" && selectedFarmerId) {
      setCachedAnalysis(selectedFarmerId, analysisQuery.state.data);
    }
  }, [analysisQuery.state, selectedFarmerId]);

  const isOffline =
    analysisQuery.state.status === "error" &&
    analysisQuery.state.httpStatus === 0;
  const cached = isOffline && selectedFarmerId ? getCachedAnalysis(selectedFarmerId) : null;

  return (
    <Layout title="KrishiGuard">
      {farmers.status === "success" && farmers.data.length === 0 && (
        <EmptyState
          title="No farmers yet"
          description="Go to Profile to register your first farmer."
        />
      )}

      {selectedFarmer && (
        <div className="mb-4 animate-fade-in-up rounded-2xl bg-leaf-700 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-leaf-100">Welcome</p>
          <p className="text-xl font-bold">{selectedFarmer.name}</p>
          <p className="text-sm text-leaf-100">
            {selectedFarmer.village}, {selectedFarmer.district}, {selectedFarmer.state}
          </p>
          <p className="mt-1 text-sm text-leaf-100">{selectedFarmer.primaryCrop} · {selectedFarmer.soilType} soil</p>
        </div>
      )}

      {selectedFarmerId && analysisQuery.state.status === "loading" && (
        <Card>
          <Skeleton lines={5} />
        </Card>
      )}

      {selectedFarmerId && analysisQuery.state.status === "error" && !cached && (
        <ErrorState
          title="Could not load your assessment"
          message={analysisQuery.state.message}
          onRetry={analysisQuery.refetch}
          offline={isOffline}
        />
      )}

      {selectedFarmerId && cached && (
        <>
          <div className="mb-3">
            <FreshnessBadge lastSuccessAt={cached.cachedAt} refreshFailed={false} cached onRetry={analysisQuery.refetch} />
          </div>
          <DashboardCards analysis={cached.data} navigate={navigate} />
        </>
      )}

      {selectedFarmerId && analysisQuery.state.status === "success" && (
        <>
          <div className="mb-3">
            <FreshnessBadge
              lastSuccessAt={analysisQuery.state.data.lastSuccessAt}
              refreshFailed={analysisQuery.state.data.refreshFailed}
              onRetry={analysisQuery.refetch}
            />
          </div>
          {!analysisQuery.state.data.market && !analysisQuery.state.data.advisory && !analysisQuery.state.data.distress ? (
            <ErrorState
              title="Assessment unavailable"
              message={analysisQuery.state.data.refreshError ?? "This farmer's first assessment hasn't completed yet."}
              onRetry={analysisQuery.refetch}
            />
          ) : (
            <DashboardCards analysis={analysisQuery.state.data} navigate={navigate} />
          )}
        </>
      )}
    </Layout>
  );
}

function DashboardCards({
  analysis,
  navigate,
}: {
  analysis: { market: import("../api/types").MarketResult | null; advisory: import("../api/types").AdvisoryResult | null; distress: import("../api/types").DistressResult | null };
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="space-y-3">
      {analysis.distress && (
        <button className="block w-full text-left" onClick={() => navigate("/distress")}>
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-soil-800">
                <AlertTriangle className="h-4 w-4" /> Distress risk
              </span>
              <ChevronRight className="h-4 w-4 text-soil-400" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={RISK_TONE[analysis.distress.riskLevel]}>{analysis.distress.riskLevel} RISK</Badge>
              <span className="text-xs text-soil-500">score {analysis.distress.riskScore}/100</span>
            </div>
          </Card>
        </button>
      )}

      {analysis.market && (
        <button className="block w-full text-left" onClick={() => navigate("/market")}>
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-soil-800">
                <TrendingUp className="h-4 w-4" /> Market — {analysis.market.crop}
              </span>
              <ChevronRight className="h-4 w-4 text-soil-400" />
            </div>
            <p className="mt-1 text-xs text-soil-500">{analysis.market.message}</p>
          </Card>
        </button>
      )}

      {analysis.advisory && (
        <button className="block w-full text-left" onClick={() => navigate("/advisory")}>
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-soil-800">
                <ClipboardList className="h-4 w-4" /> Advisory
              </span>
              <ChevronRight className="h-4 w-4 text-soil-400" />
            </div>
            <p className="mt-1 text-xs text-soil-500">{analysis.advisory.recommendations.length} recommendation(s)</p>
          </Card>
        </button>
      )}

      <button className="block w-full text-left" onClick={() => navigate("/weather")}>
        <Card>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-soil-800">
              <Cloud className="h-4 w-4" /> Weather
            </span>
            <ChevronRight className="h-4 w-4 text-soil-400" />
          </div>
          <p className="mt-1 text-xs text-soil-500">View current observation</p>
        </Card>
      </button>
    </div>
  );
}
