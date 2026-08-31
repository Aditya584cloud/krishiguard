import type { ReactNode } from "react";

const TONES = {
  leaf: "bg-leaf-100 text-leaf-800",
  wheat: "bg-wheat-100 text-wheat-700",
  danger: "bg-danger-50 text-danger-700",
  soil: "bg-soil-100 text-soil-700",
  sky: "bg-sky-50 text-sky-600",
} as const;

export function Badge({ tone = "soil", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
