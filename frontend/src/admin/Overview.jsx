import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Users, Store, Layers, CalendarCheck, ShieldAlert, Clock } from "lucide-react";

const Stat = ({ icon: Icon, label, value, testid }) => (
  <div data-testid={testid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <div className="h-10 w-10 rounded-xl bg-[#6D28D9]/10 flex items-center justify-center"><Icon className="h-5 w-5 text-[#6D28D9]" /></div>
    <p className="font-display text-4xl font-bold text-gray-900 mt-4">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)); }, []);

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500">Platform control center</p>
      </div>
      <div className="p-8">
        {!stats ? <p className="text-sm text-gray-400">Loading…</p> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <Stat testid="stat-customers" icon={Users} label="Customers" value={stats.customers} />
              <Stat testid="stat-providers" icon={Store} label="Providers" value={stats.providers} />
              <Stat testid="stat-services" icon={Layers} label="Services" value={stats.services} />
              <Stat testid="stat-bookings" icon={CalendarCheck} label="Bookings" value={stats.bookings} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <button data-testid="pending-providers-card" onClick={() => navigate("/manage/admin/providers")} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-[#6D28D9]/40 transition-colors">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
                <p className="font-display text-3xl font-bold text-gray-900 mt-3">{stats.pending_providers}</p>
                <p className="text-sm text-gray-500">Providers awaiting approval →</p>
              </button>
              <button data-testid="pending-services-card" onClick={() => navigate("/manage/admin/services")} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-[#6D28D9]/40 transition-colors">
                <Clock className="h-6 w-6 text-amber-500" />
                <p className="font-display text-3xl font-bold text-gray-900 mt-3">{stats.pending_services}</p>
                <p className="text-sm text-gray-500">Services awaiting approval →</p>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
