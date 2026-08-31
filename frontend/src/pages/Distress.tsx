import { useCallback } from "react";
import { getDistressRisk, getFarmerAnalysis } from "../api/client";
import type { DistressFactor, DistressResult } from "../api/types";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { Card } from "../components/Card";
import { EmptyState, ErrorState, SkeletonCard } from "../components/StateViews";
import { PageHeader } from "../components/PageHeader";
import { RiskPanel, riskTone } from "../components/RiskDisplay";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { Button } from "../components/Button";
import {
  Calendar,
  ChevronDown,
  CloudRain,
  Info,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "../components/icons";

function factorIcon(factor: DistressFactor) {
  const name = factor.name.toLowerCase();
  if (name.includes("rainfall")) return CloudRain;
  if (name.includes("loan")) return Calendar;
  if (!factor.available || factor.value === null) return Info;
  return factor.value > 0 ? TrendingUp : TrendingDown;
}

export function DistressPage() {
  const { selectedFarmerId, recordDistress } = useApp();
  const [state, run] = useMutation(getDistressRisk);

  // Auto-loaded, persisted snapshot (6-hour freshness window) — shown by
  // default so revisiting this page never requires a manual click. The
  // "Reassess now" button below still runs an on-demand assessment that
  // overrides the view for this session, independent of that snapshot.
  const fetchAnalysis = useCallback(() => {
    if (!selectedFarmerId) return Promise.reject(new Error("no farmer selected"));
    return getFarmerAnalysis(selectedFarmerId);
  }, [selectedFarmerId]);
  const analysisQuery = useQuery(fetchAnalysis, [selectedFarmerId]);

  const handleAssess = async () => {
    if (!selectedFarmerId) return;
    const result = await run({ farmerId: selectedFarmerId });
    if (result) recordDistress(selectedFarmerId, result);
  };

  const snapshot = analysisQuery.state.status === "success" ? analysisQuery.state.data : null;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Distress risk assessment"
        description="Rainfall, market and loan signals derived automatically from this farmer's profile — nothing to enter manually."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card title="Assess">
          {!selectedFarmerId ? (
            <EmptyState
              title="No farmer selected"
              description="Select a farmer from the top bar first."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-soil-600">
                The system derives rainfall, market and loan signals from this farmer's profile,
                weather history and mandi data automatically, and keeps the result fresh for 6
                hours.
              </p>
              <FreshnessBadge
                lastSuccessAt={snapshot?.lastSuccessAt ?? null}
                refreshFailed={snapshot?.refreshFailed ?? false}
                refreshing={analysisQuery.state.status === "loading"}
                onRetry={analysisQuery.refetch}
              />
              <Button
                onClick={handleAssess}
                loading={state.status === "loading"}
                loadingLabel="Assessing…"
                variant={state.status === "idle" && !snapshot?.distress ? "primary" : "secondary"}
                fullWidth
              >
                Reassess now
              </Button>
            </div>
          )}
        </Card>

        <Card title="Risk assessment">
          {state.status === "loading" && <SkeletonCard />}
          {state.status === "error" && (
            <ErrorState
              title="Distress assessment unavailable"
              message={state.message ?? "Unable to assess distress risk."}
            />
          )}
          {state.status === "success" && state.data && <DistressResultView result={state.data} />}
          {state.status === "idle" && (
            <>
              {analysisQuery.state.status === "loading" && <SkeletonCard />}
              {analysisQuery.state.status === "error" && (
                <ErrorState
                  title="Distress assessment unavailable"
                  message={analysisQuery.state.message}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot && !snapshot.distress && (
                <ErrorState
                  title="Assessment not generated yet"
                  message={snapshot.refreshError ?? "The first assessment attempt for this farmer hasn't succeeded yet."}
                  onRetry={analysisQuery.refetch}
                />
              )}
              {snapshot?.distress && <DistressResultView result={snapshot.distress} />}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function DistressResultView({ result }: { result: DistressResult }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-soil-600">
        {result.farmer.name} — {result.farmer.village}, {result.farmer.district}
      </p>

      <RiskPanel level={result.riskLevel} score={result.riskScore} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-soil-700">Contributing factors</h3>
        <div className="space-y-3">
          {result.factors.map((factor) => (
            <FactorBar key={factor.name} factor={factor} tone={riskTone(result.riskLevel)} />
          ))}
        </div>
      </div>

      {result.reasons.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-soil-700">Why</h3>
          <ul className="space-y-1.5">
            {result.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-soil-800">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-500" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="group rounded-lg border border-soil-100 bg-soil-50 p-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-soil-700">
          Data sources &amp; model info
          <ChevronDown className="h-4 w-4 shrink-0 text-soil-500 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="font-medium text-soil-700">Rainfall — {result.dataSources.rainfall.source}</dt>
            <dd className="text-soil-600">{result.dataSources.rainfall.note}</dd>
          </div>
          <div>
            <dt className="font-medium text-soil-700">Market — {result.dataSources.market.source}</dt>
            <dd className="text-soil-600">{result.dataSources.market.note}</dd>
          </div>
          <div>
            <dt className="font-medium text-soil-700">Loan — {result.dataSources.loan.source}</dt>
            <dd className="text-soil-600">{result.dataSources.loan.note}</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-soil-200 pt-2 text-xs text-soil-600">
          <span className="font-medium text-soil-700">Risk model:</span> {result.model.type}.{" "}
          {result.model.note}{" "}
          Measured on a held-out split: accuracy {(result.model.evaluatedAccuracy * 100).toFixed(1)}%,
          F1 {result.model.evaluatedF1.toFixed(2)}.
        </p>
      </details>

      <AlertView alert={result.alert} />
    </div>
  );
}

const FACTOR_BAR_COLOR: Record<ReturnType<typeof riskTone>, string> = {
  leaf: "bg-leaf-500",
  wheat: "bg-wheat-600",
  danger: "bg-danger-600",
};

function FactorBar({ factor, tone }: { factor: DistressFactor; tone: ReturnType<typeof riskTone> }) {
  const pct = Math.round(factor.contributionShare * 100);
  const FactorIcon = factorIcon(factor);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-soil-700">
          <FactorIcon className="h-3.5 w-3.5 text-soil-500" />
          {factor.name}
        </span>
        <span className="font-medium text-soil-600">
          {factor.available && factor.value !== null
            ? `${factor.value}${factor.unit === "%" ? "%" : ` ${factor.unit}`}`
            : "unavailable"}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-soil-100">
        <div
          className={`h-2 rounded-full transition-[width] duration-500 ${FACTOR_BAR_COLOR[tone]}`}
          style={{ width: `${factor.available ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

function AlertView({ alert }: { alert: DistressResult["alert"] }) {
  if (alert === null) {
    return (
      <p className="text-sm text-soil-600">
        Risk level is not HIGH, so no officer routing was triggered.
      </p>
    );
  }

  if (alert.status === "NO_OFFICER_FOUND") {
    return (
      <div className="rounded-lg border border-wheat-400 bg-wheat-50 p-3 text-sm text-soil-800">
        <p className="font-medium text-wheat-700">High risk — but no officer is available.</p>
        <p className="mt-1 text-soil-600">
          This farmer is in a high-risk state, but there is no registered agricultural officer
          for their district yet. This is a coverage gap, not a system error.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-600 text-white">
        <Users className="h-4 w-4" />
      </span>
      <div>
        <p className="font-medium text-danger-700">Officer routing prepared</p>
        <p className="mt-0.5 text-soil-800">
          {alert.officer.name} · {alert.officer.phone}
        </p>
        <p className="text-soil-600">
          {alert.officer.district}, {alert.officer.state}
        </p>
      </div>
    </div>
  );
}
