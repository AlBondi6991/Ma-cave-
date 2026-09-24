import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Cellar from "./pages/Cellar";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import Tastings from "./pages/Tastings";
import WineDetail from "./pages/WineDetail";
import WineEdit from "./pages/WineEdit";
import Pairings from "./pages/Pairings";
import WineList from "./pages/WineList";
import { registerServiceWorker } from "./pwa";
import "./styles.css";

const Stats = lazy(() => import("./pages/Stats"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vins" element={<WineList />} />
          <Route path="vins/nouveau" element={<WineEdit />} />
          <Route path="vins/:id" element={<WineDetail />} />
          <Route path="vins/:id/modifier" element={<WineEdit />} />
          <Route path="cave" element={<Cellar />} />
          <Route path="accords" element={<Pairings />} />
          <Route path="degustations" element={<Tastings />} />
          <Route path="stats" element={<Suspense><Stats /></Suspense>} />
          <Route path="reglages" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);

registerServiceWorker();
