import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Wires the Android hardware/gesture back button to in-app navigation: goes
 * back a screen if one is open, exits the app from the Dashboard root (the
 * expected Android behavior — an app should never trap the user with a
 * dead back button). No-ops outside a native Android shell (web/dev preview).
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = App.addListener("backButton", () => {
      if (location.pathname === "/") {
        App.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate, location.pathname]);
}
