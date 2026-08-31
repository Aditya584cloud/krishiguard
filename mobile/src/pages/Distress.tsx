import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { getDistressRisk, getFarmerAnalysis } from "../api/client";
import type { DistressResult, RiskLevel } from "../api/types";

const RISK_TONE: Record<RiskLevel, "leaf" | "wheat" | "danger"> = {
  LOW: "leaf",
  MEDIUM: "wheat",
  HIGH: "danger",
};

export function DistressPage() {
  const { selectedFarmerId } = useApp();
  const analysisQuery = useQuery(
    () => (selectedFarmerId ? getFarmerAnalysis(selectedFarmerId) : Promise.reject(new Error("No farmer selected"))),
    [selectedFarmerId],
  );
  const [mutation, runAssess] = useMutation(getDistressRisk);

  if (!selectedFarmerId) {
    return (
      <Layout title="Distress risk">
        <EmptyState title="No farmer selected" description="Select a farmer on the Profile tab." />
      </Layout>
    );
  }

  const snapshot =
    mutation.status === "success" && mutation.data
      ? mutation.data
      : analysisQuery.state.status === "success"
        ? analysisQuery.state.data.distress
        : null;

  return (
    <Layout title="Distress risk">
      {analysisQuery.state.status === "success" && mutation.status === "idle" && (
        <div className="mb-3">
          <FreshnessBadge
            lastSuccessAt={analysisQuery.state.data.lastSuccessAt}
            refreshFailed={analysisQuery.state.data.refreshFailed}
          />
        </div>
      )}

      <Button
        variant="secondary"
        fullWidth
        loading={mutation.status === "loading"}
        loadingLabel="Assessing…"
        className="mb-3"
        onClick={() => runAssess({ farmerId: selectedFarmerId })}
      >
        Reassess now
      </Button>

      {mutation.status === "error" && (
        <ErrorState className="mb-3" title="Could not assess risk" message={mutation.message ?? "Unknown error"} onRetry={() => runAssess({ farmerId: selectedFarmerId })} />
      )}

      {analysisQuery.state.status === "loading" && mutation.status === "idle" && (
        <Card>
          <Skeleton lines={5} />
        </Card>
      )}

      {snapshot ? (
        <DistressResultView result={snapshot} />
      ) : (
        analysisQuery.state.status !== "loading" &&
        mutation.status === "idle" && <EmptyState title="No assessment yet" description="Tap Reassess now above." />
      )}
    </Layout>
  );
}

function DistressResultView({ result }: { result: DistressResult }) {
  return (
    <>
      <Card className="mb-3">
        <p className="text-xs uppercase tracking-wide text-soil-500">Distress risk</p>
        <div className="mt-1 flex items-baseline gap-2">
          <Badge tone={RISK_TONE[result.riskLevel]}>{result.riskLevel}</Badge>
          <span className="text-2xl font-bold text-soil-900">{result.riskScore}</span>
          <span className="text-sm text-soil-500">/ 100</span>
        </div>
      </Card>

      {result.reasons.length > 0 && (
        <Card title="Why this assessment" className="mb-3">
          <ul className="space-y-1.5">
            {result.reasons.map((reason, i) => (
              <li key={i} className="text-sm text-soil-700">
                • {reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Contributing factors" className="mb-3">
        <ul className="space-y-2">
          {result.factors.map((f) => (
            <li key={f.name}>
              <div className="flex justify-between text-xs text-soil-600">
                <span>{f.name}</span>
                <span>{f.available ? `${f.value}${f.unit}` : "unavailable"}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soil-100">
                {f.available && (
                  <div
                    className={`h-full ${result.riskLevel === "HIGH" ? "bg-danger-600" : result.riskLevel === "MEDIUM" ? "bg-wheat-600" : "bg-leaf-600"}`}
                    style={{ width: `${Math.min(100, Math.max(0, f.contributionShare * 100))}%` }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {result.alert && (
        <Card title="Officer routing">
          {result.alert.status === "ROUTED" ? (
            <p className="text-sm text-soil-700">
              Routed to {result.alert.officer.name} ({result.alert.officer.phone}), {result.alert.officer.district}
            </p>
          ) : (
            <p className="text-sm text-wheat-700">No officer available for this location yet.</p>
          )}
        </Card>
      )}
    </>
  );
}
