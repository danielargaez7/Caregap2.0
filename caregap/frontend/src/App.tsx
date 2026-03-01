import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import RiskDashboard from "./components/RiskDashboard";
import AlertQueue from "./components/AlertQueue";
import FollowupTracker from "./components/FollowupTracker";
import PatientDetail from "./components/PatientDetail";
import AgentChat from "./components/AgentChat";
import AuditLog from "./components/AuditLog";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<RiskDashboard />} />
        <Route path="/alerts" element={<AlertQueue />} />
        <Route path="/followups" element={<FollowupTracker />} />
        <Route path="/patients/:pid" element={<PatientDetail />} />
        <Route path="/agent" element={<AgentChat />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
