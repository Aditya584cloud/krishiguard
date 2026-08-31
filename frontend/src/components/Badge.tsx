import type { ReactNode } from "react";

type Tone = "leaf" | "wheat" | "danger" | "sky" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  leaf: "bg-leaf-100 text-leaf-700 border-leaf-200",
  wheat: "bg-wheat-100 text-wheat-600 border-wheat-400",
  danger: "bg-danger-50 text-danger-700 border-danger-200",
  sky: "bg-sky-50 text-sky-600 border-sky-200",
  neutral: "bg-soil-100 text-soil-600 border-soil-100",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
