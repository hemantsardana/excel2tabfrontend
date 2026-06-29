import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalysisPage from "@/pages/AnalysisPage";
import MappingPage from "@/pages/MappingPage";
import DesignerPage from "@/pages/DesignerPage";
import AssetsPage from "@/pages/AssetsPage";
import ValidationPage from "@/pages/ValidationPage";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/workbook/:id/analysis" element={<AnalysisPage />} />
        <Route path="/workbook/:id/mapping" element={<MappingPage />} />
        <Route path="/workbook/:id/designer" element={<DesignerPage />} />
        <Route path="/workbook/:id/assets" element={<AssetsPage />} />
        <Route path="/workbook/:id/validation" element={<ValidationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
