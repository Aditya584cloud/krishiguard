import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.krishiguard.app",
  appName: "KrishiGuard",
  webDir: "dist",
  server: {
    // Cleartext HTTP is only needed for local development against a backend
    // running on plain http:// (10.0.2.2 / a LAN IP). A production backend
    // should be served over https, at which point this can be removed.
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#f7f5f0",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
