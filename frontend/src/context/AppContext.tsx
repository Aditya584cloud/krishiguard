import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getFarmers } from "../api/client";
import type { AdvisoryResult, DistressResult, Farmer, MarketResult } from "../api/types";

const SELECTED_FARMER_KEY = "krishiguard.selectedFarmerId";

export type FarmersState =
  | { status: "loading" }
  | { status: "success"; data: Farmer[] }
  | { status: "error"; message: string };

interface AppContextValue {
  selectedFarmerId: string | null;
  selectFarmer: (id: string | null) => void;
  farmers: FarmersState;
  refetchFarmers: () => void;
  lastAdvisory: Record<string, AdvisoryResult>;
  lastDistress: Record<string, DistressResult>;
  lastMarket: Record<string, MarketResult>;
  recordAdvisory: (farmerId: string, result: AdvisoryResult) => void;
  recordDistress: (farmerId: string, result: DistressResult) => void;
  recordMarket: (farmerId: string, result: MarketResult) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_FARMER_KEY),
  );
  const [farmers, setFarmers] = useState<FarmersState>({ status: "loading" });
  const [refetchTick, setRefetchTick] = useState(0);
  const [lastAdvisory, setLastAdvisory] = useState<Record<string, AdvisoryResult>>({});
  const [lastDistress, setLastDistress] = useState<Record<string, DistressResult>>({});
  const [lastMarket, setLastMarket] = useState<Record<string, MarketResult>>({});

  useEffect(() => {
    let cancelled = false;
    setFarmers({ status: "loading" });

    getFarmers()
      .then((data) => {
        if (!cancelled) setFarmers({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFarmers({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to load farmers.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refetchTick]);

  const refetchFarmers = useCallback(() => setRefetchTick((t) => t + 1), []);

  const selectFarmer = useCallback((id: string | null) => {
    setSelectedFarmerId(id);
    if (id) {
      localStorage.setItem(SELECTED_FARMER_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_FARMER_KEY);
    }
  }, []);

  const recordAdvisory = useCallback((farmerId: string, result: AdvisoryResult) => {
    setLastAdvisory((prev) => ({ ...prev, [farmerId]: result }));
  }, []);

  const recordDistress = useCallback((farmerId: string, result: DistressResult) => {
    setLastDistress((prev) => ({ ...prev, [farmerId]: result }));
  }, []);

  const recordMarket = useCallback((farmerId: string, result: MarketResult) => {
    setLastMarket((prev) => ({ ...prev, [farmerId]: result }));
  }, []);

  const value = useMemo(
    () => ({
      selectedFarmerId,
      selectFarmer,
      farmers,
      refetchFarmers,
      lastAdvisory,
      lastDistress,
      lastMarket,
      recordAdvisory,
      recordDistress,
      recordMarket,
    }),
    [
      selectedFarmerId,
      selectFarmer,
      farmers,
      refetchFarmers,
      lastAdvisory,
      lastDistress,
      lastMarket,
      recordAdvisory,
      recordDistress,
      recordMarket,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
