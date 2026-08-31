import { formatRelativeTime } from "../lib/format";
import { Clock, RefreshCw } from "./icons";

interface FreshnessBadgeProps {
  /** ISO timestamp of the last successful coherent refresh, or null before the first one. */
  lastSuccessAt: string | null;
  refreshFailed: boolean;
  refreshing?: boolean;
  onRetry?: () => void;
}

/**
 * Shows when a farmer's Market/Advisory/Distress snapshot was last
 * successfully refreshed, and — honestly — when the most recent refresh
 * attempt failed (never hiding that behind a silently-stale timestamp).
 */
export function FreshnessBadge({ lastSuccessAt, refreshFailed, refreshing, onRetry }: FreshnessBadgeProps) {
  if (refreshing) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-soil-500">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Updating your latest assessment…
      </p>
    );
  }

  if (!lastSuccessAt) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-soil-500">
      <span className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {refreshFailed ? "Last updated" : "Updated"} {formatRelativeTime(lastSuccessAt)}
      </span>
      {refreshFailed && (
        <>
          <span className="text-wheat-700">· Unable to refresh</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 rounded-md border border-wheat-400 bg-wheat-50 px-2 py-0.5 font-medium text-wheat-700 hover:bg-wheat-100 focus:outline-none focus:ring-2 focus:ring-wheat-600 focus:ring-offset-1"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}
