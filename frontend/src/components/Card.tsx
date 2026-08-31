import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Tone = "default" | "leaf" | "wheat" | "danger";

const TONE_BORDER: Record<Tone, string> = {
  default: "border-soil-100",
  leaf: "border-leaf-200",
  wheat: "border-wheat-400",
  danger: "border-danger-200",
};

interface CardProps {
  title: string;
  icon?: ReactNode;
  action?: { label: string; to: string };
  tone?: Tone;
  children: ReactNode;
}

export function Card({ title, icon, action, tone = "default", children }: CardProps) {
  return (
    <section
      className={`flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm ${TONE_BORDER[tone]}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-soil-600">
          {icon && <span className="text-soil-500">{icon}</span>}
          {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="text-sm font-medium text-leaf-600 hover:text-leaf-700 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-soil-600">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-soil-800">{value}</p>
      {hint && <p className="text-xs text-soil-600">{hint}</p>}
    </div>
  );
}
