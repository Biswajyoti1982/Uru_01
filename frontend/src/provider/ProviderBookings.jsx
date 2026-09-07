import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmt, fmtDate } from "@/lib/format";
import SessionLogDialog from "@/provider/SessionLogDialog";
import { Users, IndianRupee, TrendingUp, CalendarDays, Mail, Phone, Video, Building2, CheckCircle2, Clock, Dumbbell } from "lucide-react";

const TABS = [
  { id: "clients", label: "Clients" },
  { id: "calendar", label: "Calendar" },
  { id: "earnings", label: "Earnings" },
];

const Stat = ({ icon: Icon, label, value, tone = "orange" }) => {
  const tones = { orange: "bg-[#F97316]/15 text-[#F97316]", green: "bg-emerald-500/15 text-emerald-400", amber: "bg-amber-500/15 text-amber-400", blue: "bg-blue-500/15 text-blue-400" };
  return (
    <div className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>
    </div>
  );
};

export default function ProviderBookings() {
  const [tab, setTab] = useState("clients");
  const [clients, setClients] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ service_id: "", plan: "", mode: "", payment_status: "" });
  const [logFor, setLogFor] = useState(null);

  const loadClients = async (filters = f) => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    setClients((await api.get("/provider/clients", { params })).data);
  };

  useEffect(() => {
    (async () => {
      try {
        const [c, e, cal, svc] = await Promise.all([
          api.get("/provider/clients"),
          api.get("/provider/earnings"),
          api.get("/provider/calendar", { params: { days: 14 } }),
          api.get("/provider/services"),
        ]);
        setClients(c.data); setEarnings(e.data); setCalendar(cal.data); setServices(svc.data);
      } finally { setLoading(false); }
    })();
  }, []);

  const applyFilter = (key, val) => { const nf = { ...f, [key]: val }; setF(nf); loadClients(nf); };

  const togglePayment = async (b) => {
    const next = b.payment_status === "paid" ? "pending" : "paid";
    await api.patch(`/provider/bookings/${b.id}/payment`, { status: next });
    toast.success(next === "paid" ? "Marked paid" : "Marked pending");
    const [c, e] = await Promise.all([api.get("/provider/clients", { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }), api.get("/provider/earnings")]);
    setClients(c.data); setEarnings(e.data);
  };

  const sel = "text-sm border border-white/10 rounded-xl px-3 py-2 focus:border-[#F97316] outline-none bg-white/5 text-white";

  return (
    <div>
      <div className="bg-[#0F1420] border-b border-white/10 px-4 sm:px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-white">Bookings & clients</h1>
        <p className="text-sm text-gray-400">Manage your subscribers, schedule and earnings</p>
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => (
            <button key={t.id} data-testid={`bookings-tab-${t.id}`} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === t.id ? "bg-[#F97316] text-white" : "bg-white/10 text-gray-400 hover:bg-white/5"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {/* Summary stats */}
        {earnings && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat icon={Users} label="Clients" value={earnings.client_count} tone="orange" />
            <Stat icon={IndianRupee} label="Collected" value={fmt(earnings.collected)} tone="green" />
            <Stat icon={Clock} label="Due" value={fmt(earnings.due)} tone="amber" />
            <Stat icon={TrendingUp} label="Potential" value={fmt(earnings.potential)} tone="blue" />
          </div>
        )}

        {loading ? <p className="text-sm text-gray-500">Loading…</p> : (
          <>
            {/* CLIENTS */}
            {tab === "clients" && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <select data-testid="filter-service" className={sel} value={f.service_id} onChange={(e) => applyFilter("service_id", e.target.value)}>
                    <option value="">All services</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  <select data-testid="filter-plan" className={sel} value={f.plan} onChange={(e) => applyFilter("plan", e.target.value)}>
                    <option value="">All plans</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                  </select>
                  <select data-testid="filter-mode" className={sel} value={f.mode} onChange={(e) => applyFilter("mode", e.target.value)}>
                    <option value="">All modes</option><option value="physical">Physical</option><option value="virtual">Virtual</option>
                  </select>
                  <select data-testid="filter-payment" className={sel} value={f.payment_status} onChange={(e) => applyFilter("payment_status", e.target.value)}>
                    <option value="">All fees</option><option value="paid">Paid</option><option value="pending">Pending</option>
                  </select>
                </div>

                {clients.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center"><Users className="h-10 w-10 text-gray-600 mb-3" /><h3 className="font-display text-xl font-bold text-white">No clients yet</h3></div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((b) => (
                      <div key={b.id} data-testid={`client-${b.id}`} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-white">{b.customer_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> {b.customer_email}</p>
                            {b.customer_phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {b.customer_phone}</p>}
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              {b.mode === "virtual" ? <Video className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                              {b.mode === "virtual" ? "Online" : (b.society_name || "Physical")}
                              {b.address && b.mode !== "virtual" ? <span className="text-gray-600"> · {b.address}</span> : null}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-white">{fmt(b.total)}</p>
                            <button data-testid={`toggle-payment-${b.id}`} onClick={() => togglePayment(b)} className={`mt-1 text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${b.payment_status === "paid" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                              {b.payment_status === "paid" ? "Paid" : `Due ${fmt(b.fee_due)}`}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                          <div><p className="text-[10px] uppercase text-gray-500 font-semibold">Program</p><p className="text-xs font-medium text-gray-200 truncate">{b.service_title}</p><p className="text-[11px] text-gray-500">{b.plan_label} · {b.time_slot}</p></div>
                          <div><p className="text-[10px] uppercase text-gray-500 font-semibold">Sessions</p><p className="text-xs font-medium text-gray-200">{b.sessions_completed}/{b.sessions_total}</p><p className="text-[11px] text-gray-500">{b.sessions_due} due</p></div>
                          <div><p className="text-[10px] uppercase text-gray-500 font-semibold">Period</p><p className="text-xs font-medium text-gray-200">{fmtDate(b.start_date || b.date)}</p><p className="text-[11px] text-gray-500">to {fmtDate(b.end_date)}</p></div>
                        </div>
                        <button data-testid={`log-session-${b.id}`} onClick={() => setLogFor(b)} className="mt-3 w-full rounded-full bg-[#F97316]/10 text-[#F97316] hover:bg-[#F97316]/20 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"><Dumbbell className="h-3.5 w-3.5" /> Log / view sessions</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CALENDAR */}
            {tab === "calendar" && (
              <div>
                <p className="text-sm text-gray-400 mb-3 flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Next 14 days — sessions & clients</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {calendar.map((d) => (
                    <div key={d.date} data-testid={`cal-${d.date}`} className={`rounded-2xl border p-4 ${d.sessions > 0 ? "border-[#F97316]/40 bg-[#F97316]/10" : "border-white/10 bg-[#151A24]"}`}>
                      <div className="flex items-center justify-between">
                        <div><p className="text-xs text-gray-500 uppercase">{d.weekday}</p><p className="text-2xl font-bold text-white leading-none">{d.day}</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-[#F97316]">{d.sessions} sess.</p><p className="text-xs text-gray-500">{d.clients} client{d.clients !== 1 ? "s" : ""}</p></div>
                      </div>
                      {d.by_service.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                          {d.by_service.map((s) => <p key={s.service} className="text-[11px] text-gray-400 flex justify-between"><span className="truncate">{s.service}</span><span className="font-medium">{s.count}</span></p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EARNINGS */}
            {tab === "earnings" && earnings && (
              <div>
                <div className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 px-5 py-3 border-b border-white/10 text-[11px] uppercase tracking-wide text-gray-500 font-semibold bg-white/5">
                    <div className="col-span-5">Program</div><div className="col-span-2 text-center">Clients</div><div className="col-span-2 text-right">Collected</div><div className="col-span-3 text-right">Potential</div>
                  </div>
                  {earnings.by_service.length === 0 ? <p className="text-sm text-gray-500 px-5 py-6">No earnings yet.</p> : earnings.by_service.map((r) => (
                    <div key={r.service} className="grid grid-cols-12 px-5 py-4 border-b border-white/10 text-sm items-center">
                      <div className="col-span-5 font-medium text-white truncate">{r.service}</div>
                      <div className="col-span-2 text-center text-gray-400">{r.clients}</div>
                      <div className="col-span-2 text-right font-semibold text-emerald-400">{fmt(r.collected)}</div>
                      <div className="col-span-3 text-right text-gray-300">{fmt(r.potential)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 px-5 py-4 text-sm items-center bg-white/5 font-bold">
                    <div className="col-span-5 text-white">Total</div><div className="col-span-2 text-center text-gray-400">{earnings.client_count}</div>
                    <div className="col-span-2 text-right text-emerald-400">{fmt(earnings.collected)}</div><div className="col-span-3 text-right text-white">{fmt(earnings.potential)}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 bg-[#151A24] border border-white/10 rounded-xl px-4 py-3"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Mark fees paid from the Clients tab to update collected earnings.</div>
              </div>
            )}
          </>
        )}
      </div>

      <SessionLogDialog booking={logFor} open={!!logFor} onClose={() => setLogFor(null)} />
    </div>
  );
}
