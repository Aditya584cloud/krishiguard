// Optional local caching for offline resilience ONLY. The backend
// (FarmerAnalysis table, 6-hour freshness policy) remains the single source
// of truth — this cache exists purely so a farmer who loses signal can still
// see their last-known analysis instead of a blank error screen, and it is
// always shown clearly labeled as cached/not-current, never silently
// presented as live data.
//
// Uses localStorage, which inside a Capacitor WebView persists on-device
// across app restarts (it is NOT synced anywhere and is private to this app).

import type { FarmerAnalysisResult } from "../api/types";

const PREFIX = "krishiguard.mobile.cache.analysis.";

interface CachedAnalysis {
  cachedAt: string;
  data: FarmerAnalysisResult;
}

export function getCachedAnalysis(farmerId: string): CachedAnalysis | null {
  try {
    const raw = localStorage.getItem(PREFIX + farmerId);
    if (!raw) return null;
    return JSON.parse(raw) as CachedAnalysis;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(farmerId: string, data: FarmerAnalysisResult): void {
  try {
    const entry: CachedAnalysis = { cachedAt: new Date().toISOString(), data };
    localStorage.setItem(PREFIX + farmerId, JSON.stringify(entry));
  } catch {
    // Storage can be full or unavailable (e.g. private mode) — caching is a
    // best-effort resilience feature, never a requirement for the app to work.
  }
}
