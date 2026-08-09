import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-1 w-40 bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 bg-[#39FF14] animate-pulse" />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return children;
}
