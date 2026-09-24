import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Cellar from "./pages/Cellar";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import Tastings from "./pages/Tastings";
import WineDetail from "./pages/WineDetail";
import WineEdit from "./pages/WineEdit";
import WineList from "./pages/WineList";
import "./styles.css";

const Stats = lazy(() => import("./pages/Stats"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vins" element={<WineList />} />
          <Route path="vins/nouveau" element={<WineEdit />} />
          <Route path="vins/:id" element={<WineDetail />} />
          <Route path="vins/:id/modifier" element={<WineEdit />} />
          <Route path="cave" element={<Cellar />} />
          <Route path="degustations" element={<Tastings />} />
          <Route path="stats" element={<Suspense><Stats /></Suspense>} />
          <Route path="reglages" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
