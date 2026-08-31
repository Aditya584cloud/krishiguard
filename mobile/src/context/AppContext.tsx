import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getFarmers } from "../api/client";
import type { Farmer } from "../api/types";

const SELECTED_FARMER_KEY = "krishiguard.mobile.selectedFarmerId";

export type FarmersState =
  | { status: "loading" }
  | { status: "success"; data: Farmer[] }
  | { status: "error"; message: string };

interface AppContextValue {
  selectedFarmerId: string | null;
  selectedFarmer: Farmer | null;
  selectFarmer: (id: string | null) => void;
  farmers: FarmersState;
  refetchFarmers: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_FARMER_KEY),
  );
  const [farmers, setFarmers] = useState<FarmersState>({ status: "loading" });
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFarmers({ status: "loading" });

    getFarmers()
      .then((data) => {
        if (cancelled) return;
        setFarmers({ status: "success", data });
        // Auto-select the first farmer on first launch so the app is never
        // stuck on an empty state when farmers already exist (e.g. registered
        // via the web app).
        setSelectedFarmerId((current) => {
          if (current && data.some((f) => f.id === current)) return current;
          const first = data[0]?.id ?? null;
          if (first) localStorage.setItem(SELECTED_FARMER_KEY, first);
          return first;
        });
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
    if (id) localStorage.setItem(SELECTED_FARMER_KEY, id);
    else localStorage.removeItem(SELECTED_FARMER_KEY);
  }, []);

  const selectedFarmer = useMemo(() => {
    if (farmers.status !== "success" || !selectedFarmerId) return null;
    return farmers.data.find((f) => f.id === selectedFarmerId) ?? null;
  }, [farmers, selectedFarmerId]);

  const value = useMemo(
    () => ({ selectedFarmerId, selectedFarmer, selectFarmer, farmers, refetchFarmers }),
    [selectedFarmerId, selectedFarmer, selectFarmer, farmers, refetchFarmers],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
