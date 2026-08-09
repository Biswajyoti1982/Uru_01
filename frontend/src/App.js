import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthCallback from "@/components/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/components/Landing";
import DashboardLayout from "@/components/DashboardLayout";
import Browse from "@/pages/customer/Browse";
import ActivityDetail from "@/pages/customer/ActivityDetail";
import MyEnrollments from "@/pages/customer/MyEnrollments";
import BecomeProvider from "@/pages/provider/BecomeProvider";
import ProviderServices from "@/pages/provider/ProviderServices";
import ProviderEnrollments from "@/pages/provider/ProviderEnrollments";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminProviders from "@/pages/admin/AdminProviders";
import AdminServices from "@/pages/admin/AdminServices";

const DashboardIndex = () => {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/app/admin" replace />;
  return <Navigate to="/app/browse" replace />;
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardIndex />} />
        <Route path="browse" element={<Browse />} />
        <Route path="activity/:id" element={<ActivityDetail />} />
        <Route path="enrollments" element={<MyEnrollments />} />
        <Route path="become-provider" element={<BecomeProvider />} />
        <Route path="provider/services" element={<ProviderServices />} />
        <Route path="provider/enrollments" element={<ProviderEnrollments />} />
        <Route path="admin" element={<AdminOverview />} />
        <Route path="admin/providers" element={<AdminProviders />} />
        <Route path="admin/services" element={<AdminServices />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" theme="dark" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
