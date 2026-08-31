import { Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { FarmersPage } from "./pages/Farmers";
import { WeatherPage } from "./pages/Weather";
import { MarketPage } from "./pages/Market";
import { AdvisoryPage } from "./pages/Advisory";
import { DistressPage } from "./pages/Distress";

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/farmers" element={<FarmersPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/advisory" element={<AdvisoryPage />} />
          <Route path="/distress" element={<DistressPage />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}
