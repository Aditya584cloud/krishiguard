const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inrFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value}%`;
}

/** "Updated 2h ago" style relative-time label — never fabricates a value for a missing timestamp. */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";

  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m ago` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
