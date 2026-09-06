import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Users, Store, Layers, CalendarCheck, ShieldAlert, Clock } from "lucide-react";

const Stat = ({ icon: Icon, label, value, testid }) => (
  <div data-testid={testid} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-6">
    <div className="h-10 w-10 rounded-xl bg-[#F97316]/10 flex items-center justify-center"><Icon className="h-5 w-5 text-[#F97316]" /></div>
    <p className="font-display text-4xl font-bold text-white mt-4">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{label}</p>
  </div>
);

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);

  return (
    <div>
      <div className="bg-[#0F1420] border-b border-white/10 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-400">Platform control center</p>
      </div>
      <div className="p-8">
        {!stats ? <p className="text-sm text-gray-500">Loading…</p> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Stat testid="stat-customers" icon={Users} label="Customers" value={stats.customers} />
              <Stat testid="stat-providers" icon={Store} label="Providers" value={stats.providers} />
              <Stat testid="stat-services" icon={Layers} label="Services" value={stats.services} />
              <Stat testid="stat-bookings" icon={CalendarCheck} label="Bookings" value={stats.bookings} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <button data-testid="pending-providers-card" onClick={() => navigate("/manage/admin/providers")} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-6 text-left hover:border-[#F97316]/50 transition-colors">
                <ShieldAlert className="h-6 w-6 text-amber-400" />
                <p className="font-display text-3xl font-bold text-white mt-3">{stats.pending_providers}</p>
                <p className="text-sm text-gray-400">Providers awaiting approval →</p>
              </button>
              <button data-testid="pending-services-card" onClick={() => navigate("/manage/admin/services")} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-6 text-left hover:border-[#F97316]/50 transition-colors">
                <Clock className="h-6 w-6 text-amber-400" />
                <p className="font-display text-3xl font-bold text-white mt-3">{stats.pending_services}</p>
                <p className="text-sm text-gray-400">Services awaiting approval →</p>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
