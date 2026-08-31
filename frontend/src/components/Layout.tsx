import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { FarmerSelector } from "./FarmerSelector";
import { CloudRain, LayoutGrid, ShieldAlert, Sprout, Store, Users } from "./icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutGrid },
  { to: "/farmers", label: "Farmers", icon: Users },
  { to: "/weather", label: "Weather", icon: CloudRain },
  { to: "/market", label: "Market", icon: Store },
  { to: "/advisory", label: "Advisory", icon: Sprout },
  { to: "/distress", label: "Distress", icon: ShieldAlert },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-soil-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-leaf-700 focus:shadow"
      >
        Skip to content
      </a>
      <header className="border-b border-soil-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-600 text-lg" aria-hidden="true">
              🌾
            </span>
            <div>
              <p className="text-lg font-bold leading-tight text-leaf-800">KrishiGuard</p>
              <p className="hidden text-xs leading-tight text-soil-500 sm:block">
                AI-assisted crop advisory &amp; farmer distress early-warning
              </p>
            </div>
          </div>
          <FarmerSelector />
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4" aria-label="Primary">
          <ul className="flex gap-1 border-t border-soil-100 sm:gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-leaf-600 text-leaf-700"
                        : "border-transparent text-soil-600 hover:border-soil-200 hover:text-soil-800"
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
