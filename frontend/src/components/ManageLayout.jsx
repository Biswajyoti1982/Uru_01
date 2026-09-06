import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Store, ClipboardList, LayoutDashboard, Users, ShieldCheck, ArrowLeft, LayoutGrid, Building2, UserCog, Menu, X, Eye } from "lucide-react";
import { UruLogo } from "@/components/UruLogo";

const Item = ({ to, icon: Icon, label, testid, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    data-testid={testid}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive ? "bg-[#F97316] text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
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
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const isProvider = user?.provider_status === "approved" || isAdmin;

  if (!isProvider && !isAdmin) return <Navigate to="/app" replace />;

  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-[#0F1420] border-b border-white/10 h-14 flex items-center gap-3 px-4">
        <button data-testid="menu-open-button" onClick={() => setOpen(true)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95 transition-transform">
          <Menu className="h-5 w-5 text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <UruLogo size={28} />
          <span className="font-display text-lg font-bold text-white">URU <span className="text-gray-500 font-medium text-xs">Console</span></span>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {open && <div data-testid="menu-backdrop" onClick={close} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen w-64 bg-[#0F1420] border-r border-white/10 flex flex-col z-50 transform transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <UruLogo size={32} />
          <span className="font-display text-xl font-bold text-white">URU <span className="text-gray-500 font-medium text-sm">Console</span></span>
          <button data-testid="menu-close-button" onClick={close} className="lg:hidden ml-auto h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {isProvider && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Provider</p>
              <Item to="/manage/provider" end icon={LayoutDashboard} label="Home" testid="nav-provider-home" onClick={close} />
              <Item to="/manage/provider/services" icon={Store} label="My Services" testid="nav-provider-services" onClick={close} />
              <Item to="/manage/provider/profile" icon={UserCog} label="My Profile" testid="nav-provider-profile" onClick={close} />
              <Item to="/manage/provider/bookings" icon={ClipboardList} label="Bookings" testid="nav-provider-bookings" onClick={close} />
            </>
          )}
          {isAdmin && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Admin</p>
              <Item to="/manage/admin" icon={LayoutDashboard} label="Overview" testid="nav-admin-overview" end onClick={close} />
              <Item to="/manage/admin/providers" icon={Users} label="Providers" testid="nav-admin-providers" onClick={close} />
              <Item to="/manage/admin/services" icon={ShieldCheck} label="Services" testid="nav-admin-services" onClick={close} />
              <Item to="/manage/admin/categories" icon={LayoutGrid} label="Activities" testid="nav-admin-categories" onClick={close} />
              <Item to="/manage/admin/societies" icon={Building2} label="Societies" testid="nav-admin-societies" onClick={close} />
            </>
          )}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            data-testid="preview-customer-app-button"
            onClick={() => window.open("/app?preview=1", "_blank")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 py-2.5 text-sm font-semibold transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview as customer
          </button>
          <button
            data-testid="back-to-app-button"
            onClick={() => navigate("/app")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white py-2.5 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </button>
        </div>
      </aside>

      <main className="lg:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
