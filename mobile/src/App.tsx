import { HashRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { DashboardPage } from "./pages/Dashboard";
import { MarketPage } from "./pages/Market";
import { AdvisoryPage } from "./pages/Advisory";
import { DistressPage } from "./pages/Distress";
import { WeatherPage } from "./pages/Weather";
import { ProfilePage } from "./pages/Profile";

// HashRouter (not BrowserRouter): the app is served from a local file/asset
// origin on-device with no server to handle SPA deep-link fallbacks, so
// hash-based routes are the reliable choice inside a packaged Capacitor app.
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/advisory" element={<AdvisoryPage />} />
          <Route path="/distress" element={<DistressPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
