import { AlertTriangle, Inbox, WifiOff } from "./icons";
import { Button } from "./Button";

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-soil-100" style={{ width: `${85 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-soil-500">
      <Inbox className="h-8 w-8" />
      <p className="text-sm font-medium text-soil-700">{title}</p>
      {description && <p className="text-xs">{description}</p>}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
  offline,
  className = "",
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  offline?: boolean;
  className?: string;
}) {
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl bg-danger-50 px-4 py-6 text-center ${className}`}>
      <Icon className="h-8 w-8 text-danger-600" />
      <p className="text-sm font-semibold text-danger-700">{title}</p>
      <p className="text-xs text-danger-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}
