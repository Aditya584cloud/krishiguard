import { Clock, RefreshCw } from "./icons";
import { Button } from "./Button";
import { formatRelativeTime } from "../lib/format";

export function FreshnessBadge({
  lastSuccessAt,
  refreshFailed,
  refreshing,
  onRetry,
  cached,
}: {
  lastSuccessAt: string | null;
  refreshFailed: boolean;
  refreshing?: boolean;
  onRetry?: () => void;
  /** True when this is a locally cached view shown because the live refresh failed. */
  cached?: boolean;
}) {
  if (refreshing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-soil-500">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Updating your latest assessment…
      </div>
    );
  }

  if (!lastSuccessAt) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-soil-500">
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {cached ? "Cached" : "Updated"} {formatRelativeTime(lastSuccessAt)}
      </span>
      {refreshFailed && (
        <>
          <span className="text-wheat-700">· Unable to refresh</span>
          {onRetry && (
            <Button variant="ghost" onClick={onRetry} className="!min-h-0 !px-2 !py-0.5 text-xs">
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
