import { AlertTriangle, Inbox } from "./icons";

interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function Skeleton({ lines = 3, className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-soil-100"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

/** A full loading skeleton shaped like a typical result card — used where a
 * bare line-skeleton would look too far from the eventual layout. */
export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="h-4 w-1/3 rounded bg-soil-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-2/3 rounded bg-soil-100" />
            <div className="h-5 w-1/2 rounded bg-soil-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-danger-700/90">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-danger-200 bg-white px-3 py-1.5 text-sm font-medium text-danger-700 hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-danger-600 focus:ring-offset-1"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-soil-200 bg-soil-50 p-6 text-center">
      <Inbox className="mx-auto h-6 w-6 text-soil-400" />
      <p className="mt-2 font-medium text-soil-800">{title}</p>
      {description && <p className="mt-1 text-sm text-soil-600">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700 focus:outline-none focus:ring-2 focus:ring-leaf-600 focus:ring-offset-1"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
