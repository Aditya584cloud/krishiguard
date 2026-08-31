import { Layout } from "../components/Layout";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, Skeleton } from "../components/StateViews";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { useApp } from "../context/AppContext";
import { useMutation, useQuery } from "../hooks/useQuery";
import { getAdvisory, getFarmerAnalysis } from "../api/client";
import type { AdvisoryResult } from "../api/types";

export function AdvisoryPage() {
  const { selectedFarmerId } = useApp();
  const analysisQuery = useQuery(
    () => (selectedFarmerId ? getFarmerAnalysis(selectedFarmerId) : Promise.reject(new Error("No farmer selected"))),
    [selectedFarmerId],
  );
  const [mutation, runGenerate] = useMutation(getAdvisory);

  if (!selectedFarmerId) {
    return (
      <Layout title="Advisory">
        <EmptyState title="No farmer selected" description="Select a farmer on the Profile tab." />
      </Layout>
    );
  }

  const snapshot =
    mutation.status === "success" && mutation.data
      ? mutation.data
      : analysisQuery.state.status === "success"
        ? analysisQuery.state.data.advisory
        : null;

  return (
    <Layout title="Advisory">
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
        loadingLabel="Generating…"
        className="mb-3"
        onClick={() => runGenerate({ farmerId: selectedFarmerId })}
      >
        {snapshot ? "Regenerate now" : "Get advisory"}
      </Button>

      {mutation.status === "error" && (
        <ErrorState className="mb-3" title="Could not generate advisory" message={mutation.message ?? "Unknown error"} onRetry={() => runGenerate({ farmerId: selectedFarmerId })} />
      )}

      {analysisQuery.state.status === "loading" && mutation.status === "idle" && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}

      {snapshot ? (
        <AdvisoryResultView result={snapshot} />
      ) : (
        analysisQuery.state.status !== "loading" &&
        mutation.status === "idle" && <EmptyState title="No advisory yet" description="Tap Get advisory above." />
      )}
    </Layout>
  );
}

function AdvisoryResultView({ result }: { result: AdvisoryResult }) {
  return (
    <>
      <Card title={`Crop: ${result.crop}`} className="mb-3">
        <p className="text-sm text-soil-600">Soil: {result.soil}</p>
        <p className="text-sm text-soil-600">
          {result.weather.temperatureC}°C · {result.weather.humidityPercent}% humidity · {result.weather.rainMm}mm rain
        </p>
      </Card>
      <Card title="Recommendations">
        <ul className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-leaf-50 p-2 text-sm text-soil-800">
              <span className="font-semibold text-leaf-700">{i + 1}.</span>
              {rec}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
