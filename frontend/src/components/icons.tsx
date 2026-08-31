import type { SVGProps } from "react";

// Small, hand-drawn inline icon set (no icon-library dependency — keeps the
// bundle tiny and styling fully consistent with the rest of the app).
// Every icon shares the same 24x24 stroke-based construction so they drop
// into text at any size via className (e.g. "h-4 w-4").

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function Thermometer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3a2 2 0 0 0-2 2v9.17a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2Z" />
      <path d="M12 15V8" />
    </svg>
  );
}

export function CloudRain(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 16a4.5 4.5 0 0 1 .5-8.98A5.5 5.5 0 0 1 18 9.5a3.5 3.5 0 0 1-1 6.5H7Z" />
      <path d="M8 19v1M12 19v2M16 19v1" />
    </svg>
  );
}

export function Droplet(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3Z" />
    </svg>
  );
}

export function Wind(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5" />
      <path d="M3 12h14a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M3 16h8a2 2 0 1 1-2 2" />
    </svg>
  );
}

export function Sprout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3 2.5-5 6-5 0 3-2.5 5-6 5Z" />
      <path d="M12 13c0-2.5-2-4.5-5-4.5C7 11 9 13 12 13Z" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </svg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function Banknote(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" />
    </svg>
  );
}

export function ShieldAlert(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6l-7-3Z" />
      <path d="M12 8.5v4M12 15.5v.01" />
    </svg>
  );
}

export function TrendingUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 16.5 9.5 10l4 4L21 6.5" />
      <path d="M15.5 6.5H21V12" />
    </svg>
  );
}

export function TrendingDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7.5 9.5 14l4-4L21 17.5" />
      <path d="M15.5 17.5H21V12" />
    </svg>
  );
}

export function Store(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3.5 9.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  );
}

export function Users(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M15 14.2a5.5 5.5 0 0 1 5.5 5.8h-3" />
    </svg>
  );
}

export function Info(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 8v.01" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 8.5 12 15l6.5-6.5" />
    </svg>
  );
}

export function CheckCircle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3l2.5 2.5L16 9.3" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16M13 5.5 19.5 12 13 18.5" />
    </svg>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10.5v4.5M12 18v.01" />
    </svg>
  );
}

export function Inbox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 12.5h5l1.5 2.5h4l1.5-2.5h5" />
      <path d="M5 5.5h14L21 12.5v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-6L5 5.5Z" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function RefreshCw(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5L19.5 8.5" />
      <path d="M19.5 4.5v4h-4" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.6 5.5L4.5 15.5" />
      <path d="M4.5 19.5v-4h4" />
    </svg>
  );
}

export function LayoutGrid(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v3M12 18v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}
