import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowLeft, MapPin } from "./icons";

/**
 * Shows the app title (root routes) or a back button + page title (sub
 * routes), plus which farmer's data is currently being viewed — since there
 * is no login, "which farmer" is the only identity concept this app has, and
 * it must always be visible so a switch on the Profile tab is never confusing.
 */
export function TopBar({ title, showBack }: { title: string; showBack?: boolean }) {
  const navigate = useNavigate();
  const { selectedFarmer } = useApp();

  return (
    <header className="safe-top sticky top-0 z-10 border-b border-soil-100 bg-soil-50/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-soil-100"
          >
            <ArrowLeft className="h-5 w-5 text-soil-700" />
          </button>
        )}
        <h1 className="truncate text-lg font-bold text-soil-900">{title}</h1>
      </div>
      {selectedFarmer && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-soil-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {selectedFarmer.name} · {selectedFarmer.village}, {selectedFarmer.district}
        </p>
      )}
    </header>
  );
}
