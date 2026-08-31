// Small hand-picked set of stroke icons used across the mobile UI. Kept as
// an independent file (not shared with frontend/) — simple inline SVGs, no
// icon library dependency.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function Home(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

export function TrendingUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

export function ClipboardList(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3h6v3H9z" />
      <path d="M9 11h6M9 15h6M9 19h3" />
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  );
}

export function User(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </svg>
  );
}

export function Users(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c1-3 3.5-5 6-5s5 2 6 5" />
      <path d="M16 6.5c1.5.3 2.5 1.5 2.5 3s-1 2.7-2.5 3" />
      <path d="M17 15.2c2 .5 3.5 2.2 4.3 4.8" />
    </svg>
  );
}

export function Cloud(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 8.03 4 4 0 0 1 17 18H7Z" />
    </svg>
  );
}

export function RefreshCw(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function Sprout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M12 12C7 12 5 8 5 5c4 0 7 2 7 7Z" />
      <path d="M12 9c0-3 2-5 6-5 0 3-1 6-6 6" />
    </svg>
  );
}

export function Banknote(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 10v.01M18 14v.01" />
    </svg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function Plus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function WifiOff(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m2 2 20 20" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.5a10 10 0 0 1 3.5-2.3M19 12.5a10 10 0 0 0-3.5-2.3" />
      <path d="M2 8.5a15 15 0 0 1 4-2.6" />
      <path d="M22 8.5a15 15 0 0 0-8-4.4" />
      <path d="M12 20h.01" />
    </svg>
  );
}

export function Inbox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3.5 7v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7l3.5-7Z" />
    </svg>
  );
}
