import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import AuthCallback from "@/components/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/components/URULanding";
import CustomerLayout from "@/components/CustomerLayout";
import ManageLayout from "@/components/ManageLayout";
import Home from "@/customer/Home";
import ServicePage from "@/customer/ServicePage";
import Cart from "@/customer/Cart";
import Checkout from "@/customer/Checkout";
import Bookings from "@/customer/Bookings";
import Account from "@/customer/Account";
import Onboard from "@/provider/Onboard";
import ProviderDashboard from "@/provider/Dashboard";
import ProviderBookings from "@/provider/ProviderBookings";
import AdminOverview from "@/admin/Overview";
import AdminProviders from "@/admin/Providers";
import AdminServices from "@/admin/Services";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/app" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="service/:id" element={<ServicePage />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="account" element={<Account />} />
        <Route path="become-provider" element={<Onboard />} />
      </Route>

      <Route path="/manage" element={<ProtectedRoute><ManageLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/manage/provider/services" replace />} />
        <Route path="provider/services" element={<ProviderDashboard />} />
        <Route path="provider/bookings" element={<ProviderBookings />} />
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
          <CartProvider>
            <AppRouter />
            <Toaster position="top-center" />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
