import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Dumbbell, Compass, CalendarCheck, Store, Users, LayoutDashboard,
  ShieldCheck, LogOut, BadgePlus, ClipboardList,
} from "lucide-react";

const NavItem = ({ to, icon: Icon, label, testid, end }) => (
  <NavLink
    to={to}
    end={end}
    data-testid={testid}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider font-medium border-l-2 transition-colors ${
        isActive
          ? "border-[#39FF14] bg-white/5 text-white"
          : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
      }`
    }
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isProvider = user?.provider_status === "approved" || isAdmin;
  const canApply = !isAdmin && user?.provider_status !== "approved";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0d0d0d] flex flex-col fixed h-screen">
        <div
          className="h-16 flex items-center gap-2 px-6 border-b border-white/10 cursor-pointer"
          onClick={() => navigate("/app")}
          data-testid="sidebar-logo"
        >
          <div className="h-7 w-7 bg-[#39FF14] flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-black" />
          </div>
          <span className="font-display text-2xl font-black uppercase tracking-tighter">FitConnect</span>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/30">Discover</div>
          <NavItem to="/app/browse" icon={Compass} label="Browse" testid="nav-browse" />
          <NavItem to="/app/enrollments" icon={CalendarCheck} label="My Classes" testid="nav-enrollments" />

          {isProvider && (
            <>
              <div className="px-4 py-2 mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">Provider</div>
              <NavItem to="/app/provider/services" icon={Store} label="My Services" testid="nav-provider-services" />
              <NavItem to="/app/provider/enrollments" icon={ClipboardList} label="Attendees" testid="nav-provider-enrollments" />
            </>
          )}

          {canApply && (
            <>
              <div className="px-4 py-2 mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">Grow</div>
              <NavItem to="/app/become-provider" icon={BadgePlus} label="Become a Provider" testid="nav-become-provider" />
            </>
          )}

          {isAdmin && (
            <>
              <div className="px-4 py-2 mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">Admin</div>
              <NavItem to="/app/admin" icon={LayoutDashboard} label="Overview" testid="nav-admin-overview" end />
              <NavItem to="/app/admin/providers" icon={Users} label="Providers" testid="nav-admin-providers" />
              <NavItem to="/app/admin/services" icon={ShieldCheck} label="Services" testid="nav-admin-services" />
            </>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 bg-white/10 flex items-center justify-center font-display font-bold text-[#39FF14] uppercase">
              {user?.name?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" data-testid="sidebar-user-name">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#39FF14]">{user?.role}</p>
            </div>
          </div>
          <button
            data-testid="logout-button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 border border-white/20 text-white/70 hover:text-white hover:bg-white/10 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
