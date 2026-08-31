import type { RiskLevel } from "../api/types";
import { ShieldAlert } from "./icons";

type RiskTone = "leaf" | "wheat" | "danger";

const RISK_TONE: Record<RiskLevel, RiskTone> = {
  LOW: "leaf",
  MEDIUM: "wheat",
  HIGH: "danger",
};

const RISK_SURFACE: Record<RiskTone, string> = {
  leaf: "border-leaf-200 bg-leaf-50 text-leaf-900",
  wheat: "border-wheat-400 bg-wheat-50 text-wheat-700",
  danger: "border-danger-200 bg-danger-50 text-danger-700",
};

const RISK_ICON_SURFACE: Record<RiskTone, string> = {
  leaf: "bg-leaf-600 text-white",
  wheat: "bg-wheat-600 text-white",
  danger: "bg-danger-600 text-white",
};

const RISK_NEXT_ACTION: Record<RiskLevel, string> = {
  LOW: "No action needed right now — continue regular monitoring.",
  MEDIUM: "Worth a closer look — review the advisory and market trend below.",
  HIGH: "Recommended: contact the assigned agricultural officer (see below).",
};

export function riskTone(level: RiskLevel): RiskTone {
  return RISK_TONE[level];
}

/** Compact risk indicator for summary contexts (e.g. the Dashboard card). */
export function RiskPill({ level, score }: { level: RiskLevel; score: number }) {
  const tone = riskTone(level);
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${RISK_SURFACE[tone]}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${RISK_ICON_SURFACE[tone]}`}>
        <ShieldAlert className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight">{level} RISK</p>
        <p className="text-xs leading-tight opacity-80">{score} / 100</p>
      </div>
    </div>
  );
}

/** Prominent, full risk panel — the focal point of the Distress page. */
export function RiskPanel({ level, score }: { level: RiskLevel; score: number }) {
  const tone = riskTone(level);
  return (
    <div className={`rounded-xl border p-5 ${RISK_SURFACE[tone]}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${RISK_ICON_SURFACE[tone]}`}>
          <ShieldAlert className="h-7 w-7" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Distress risk</p>
          <p className="text-3xl font-bold leading-tight">{level}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-semibold leading-tight">{score}<span className="text-base font-normal opacity-70"> / 100</span></p>
          <p className="text-xs opacity-70">risk score</p>
        </div>
      </div>
      <p className="mt-4 border-t border-current/15 pt-3 text-sm opacity-90">
        {RISK_NEXT_ACTION[level]}
      </p>
    </div>
  );
}
