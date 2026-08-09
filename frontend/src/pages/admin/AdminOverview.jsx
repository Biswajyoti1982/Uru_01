import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { Users, Store, CalendarCheck, Clock, ShieldAlert, Layers } from "lucide-react";

const Stat = ({ icon: Icon, label, value, accent, testid }) => (
  <div data-testid={testid} className={`border bg-[#141414] p-6 ${accent ? "border-l-2 border-l-[#39FF14] border-white/10" : "border-white/10"}`}>
    <Icon className="h-6 w-6 text-[#39FF14]" />
    <p className="font-display text-5xl font-black mt-4">{value}</p>
    <p className="text-xs uppercase tracking-widest text-white/40 mt-1">{label}</p>
  </div>
);

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { (async () => setStats((await api.get("/admin/stats")).data))(); }, []);

  return (
    <div>
      <PageHeader title="Admin Overview" subtitle="Platform control center" />
      <div className="p-8">
        {!stats ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat testid="stat-customers" icon={Users} label="Customers" value={stats.customers} />
              <Stat testid="stat-providers" icon={Store} label="Providers" value={stats.providers} />
              <Stat testid="stat-services" icon={Layers} label="Services" value={stats.services} />
              <Stat testid="stat-enrollments" icon={CalendarCheck} label="Enrollments" value={stats.enrollments} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div data-testid="pending-providers-card" onClick={() => navigate("/app/admin/providers")} className="border border-white/10 bg-[#141414] p-6 cursor-pointer hover:border-white/30 transition-colors flex items-center justify-between">
                <div>
                  <ShieldAlert className="h-6 w-6 text-amber-400" />
                  <p className="font-display text-4xl font-black mt-3">{stats.pending_providers}</p>
                  <p className="text-xs uppercase tracking-widest text-white/40 mt-1">Providers awaiting approval</p>
                </div>
                <span className="text-xs uppercase tracking-widest text-[#39FF14]">Review →</span>
              </div>
              <div data-testid="pending-services-card" onClick={() => navigate("/app/admin/services")} className="border border-white/10 bg-[#141414] p-6 cursor-pointer hover:border-white/30 transition-colors flex items-center justify-between">
                <div>
                  <Clock className="h-6 w-6 text-amber-400" />
                  <p className="font-display text-4xl font-black mt-3">{stats.pending_services}</p>
                  <p className="text-xs uppercase tracking-widest text-white/40 mt-1">Services awaiting approval</p>
                </div>
                <span className="text-xs uppercase tracking-widest text-[#39FF14]">Review →</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
