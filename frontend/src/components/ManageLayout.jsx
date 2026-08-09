import React from "react";
import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Store, ClipboardList, LayoutDashboard, Users, ShieldCheck, ArrowLeft, LayoutGrid, Building2, UserCog } from "lucide-react";

const Item = ({ to, icon: Icon, label, testid, end }) => (
  <NavLink
    to={to}
    end={end}
    data-testid={testid}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive ? "bg-[#6D28D9] text-white" : "text-gray-600 hover:bg-gray-100"
      }`
    }
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);

export default function ManageLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isProvider = user?.provider_status === "approved" || isAdmin;

  if (!isProvider && !isAdmin) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-100">
          <div className="h-8 w-8 rounded-xl bg-[#6D28D9] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-xl font-bold">URU <span className="text-gray-400 font-medium text-sm">Console</span></span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {isProvider && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Provider</p>
              <Item to="/manage/provider/services" icon={Store} label="My Services" testid="nav-provider-services" />
              <Item to="/manage/provider/profile" icon={UserCog} label="My Profile" testid="nav-provider-profile" />
              <Item to="/manage/provider/bookings" icon={ClipboardList} label="Bookings" testid="nav-provider-bookings" />
            </>
          )}
          {isAdmin && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Admin</p>
              <Item to="/manage/admin" icon={LayoutDashboard} label="Overview" testid="nav-admin-overview" end />
              <Item to="/manage/admin/providers" icon={Users} label="Providers" testid="nav-admin-providers" />
              <Item to="/manage/admin/services" icon={ShieldCheck} label="Services" testid="nav-admin-services" />
              <Item to="/manage/admin/categories" icon={LayoutGrid} label="Activities" testid="nav-admin-categories" />
              <Item to="/manage/admin/societies" icon={Building2} label="Societies" testid="nav-admin-societies" />
            </>
          )}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            data-testid="back-to-app-button"
            onClick={() => navigate("/app")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 py-2.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
}
