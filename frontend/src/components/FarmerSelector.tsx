import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ErrorState, Skeleton } from "./StateViews";
import { MapPin } from "./icons";

export function FarmerSelector() {
  const { selectedFarmerId, selectFarmer, farmers, refetchFarmers } = useApp();

  if (farmers.status === "loading") {
    return <Skeleton lines={1} className="max-w-sm" />;
  }

  if (farmers.status === "error") {
    return <ErrorState title="Farmer list unavailable" message={farmers.message} onRetry={refetchFarmers} />;
  }

  if (farmers.data.length === 0) {
    return (
      <p className="text-sm text-soil-600">
        No farmers registered yet.{" "}
        <Link to="/farmers" className="font-medium text-leaf-600 hover:underline">
          Add your first farmer
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="farmer-select" className="flex items-center gap-1 text-sm font-medium text-soil-600">
        <MapPin className="h-4 w-4" />
        Farmer
      </label>
      <select
        id="farmer-select"
        value={selectedFarmerId ?? ""}
        onChange={(event) => selectFarmer(event.target.value || null)}
        className="rounded-md border border-soil-200 bg-white px-3 py-1.5 text-sm text-soil-800 focus:border-leaf-500 focus:outline-none focus:ring-1 focus:ring-leaf-500"
      >
        <option value="" disabled>
          Select a farmer…
        </option>
        {farmers.data.map((farmer) => (
          <option key={farmer.id} value={farmer.id}>
            {farmer.name} — {farmer.village}, {farmer.district}
          </option>
        ))}
      </select>
    </div>
  );
}
