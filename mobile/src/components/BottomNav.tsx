import { NavLink } from "react-router-dom";
import { AlertTriangle, ClipboardList, Home, TrendingUp, User } from "./icons";

const TABS = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/market", label: "Market", icon: TrendingUp, end: false },
  { to: "/advisory", label: "Advisory", icon: ClipboardList, end: false },
  { to: "/distress", label: "Distress", icon: AlertTriangle, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

export function BottomNav() {
  return (
    <nav className="safe-bottom sticky bottom-0 z-10 border-t border-soil-100 bg-white">
      <ul className="grid grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${
                  isActive ? "text-leaf-700" : "text-soil-400"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
