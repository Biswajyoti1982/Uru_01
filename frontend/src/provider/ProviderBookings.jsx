import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmt, fmtDate } from "@/lib/format";
import { Users, IndianRupee, TrendingUp, CalendarDays, Mail, Phone, MapPin, Video, Building2, CheckCircle2, Clock } from "lucide-react";

const TABS = [
  { id: "clients", label: "Clients" },
  { id: "calendar", label: "Calendar" },
  { id: "earnings", label: "Earnings" },
];

const Stat = ({ icon: Icon, label, value, tone = "violet" }) => {
  const tones = { violet: "bg-[#6D28D9]/10 text-[#6D28D9]", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", blue: "bg-blue-50 text-blue-600" };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p><p className="text-lg font-bold text-gray-900">{value}</p></div>
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

  const sel = "text-sm border border-gray-200 rounded-xl px-3 py-2 focus:border-[#6D28D9] outline-none bg-white";

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Bookings & clients</h1>
        <p className="text-sm text-gray-500">Manage your subscribers, schedule and earnings</p>
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => (
            <button key={t.id} data-testid={`bookings-tab-${t.id}`} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === t.id ? "bg-[#6D28D9] text-white" : "bg-gray-100 text-gray-600"}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {/* Summary stats */}
        {earnings && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Stat icon={Users} label="Clients" value={earnings.client_count} tone="violet" />
            <Stat icon={IndianRupee} label="Collected" value={fmt(earnings.collected)} tone="green" />
            <Stat icon={Clock} label="Due" value={fmt(earnings.due)} tone="amber" />
            <Stat icon={TrendingUp} label="Potential" value={fmt(earnings.potential)} tone="blue" />
          </div>
        )}

        {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
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
                  <div className="flex flex-col items-center py-16 text-center"><Users className="h-10 w-10 text-gray-300 mb-3" /><h3 className="font-display text-xl font-bold text-gray-900">No clients yet</h3></div>
                ) : (
                  <div className="space-y-3">
                    {clients.map((b) => (
                      <div key={b.id} data-testid={`client-${b.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{b.customer_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> {b.customer_email}</p>
                            {b.customer_phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {b.customer_phone}</p>}
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              {b.mode === "virtual" ? <Video className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                              {b.mode === "virtual" ? "Online" : (b.society_name || "Physical")}
                              {b.address && b.mode !== "virtual" ? <span className="text-gray-400"> · {b.address}</span> : null}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-900">{fmt(b.total)}</p>
                            <button data-testid={`toggle-payment-${b.id}`} onClick={() => togglePayment(b)} className={`mt-1 text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${b.payment_status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                              {b.payment_status === "paid" ? "Paid" : `Due ${fmt(b.fee_due)}`}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
                          <div><p className="text-[10px] uppercase text-gray-400 font-semibold">Program</p><p className="text-xs font-medium text-gray-800 truncate">{b.service_title}</p><p className="text-[11px] text-gray-500">{b.plan_label} · {b.time_slot}</p></div>
                          <div><p className="text-[10px] uppercase text-gray-400 font-semibold">Sessions</p><p className="text-xs font-medium text-gray-800">{b.sessions_completed}/{b.sessions_total}</p><p className="text-[11px] text-gray-500">{b.sessions_due} due</p></div>
                          <div><p className="text-[10px] uppercase text-gray-400 font-semibold">Period</p><p className="text-xs font-medium text-gray-800">{fmtDate(b.start_date || b.date)}</p><p className="text-[11px] text-gray-500">to {fmtDate(b.end_date)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CALENDAR */}
            {tab === "calendar" && (
              <div>
                <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Next 14 days — sessions & clients</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {calendar.map((d) => (
                    <div key={d.date} data-testid={`cal-${d.date}`} className={`rounded-2xl border p-4 ${d.sessions > 0 ? "border-[#6D28D9]/30 bg-[#6D28D9]/5" : "border-gray-100 bg-white"}`}>
                      <div className="flex items-center justify-between">
                        <div><p className="text-xs text-gray-400 uppercase">{d.weekday}</p><p className="text-2xl font-bold text-gray-900 leading-none">{d.day}</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-[#6D28D9]">{d.sessions} sess.</p><p className="text-xs text-gray-500">{d.clients} client{d.clients !== 1 ? "s" : ""}</p></div>
                      </div>
                      {d.by_service.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                          {d.by_service.map((s) => <p key={s.service} className="text-[11px] text-gray-600 flex justify-between"><span className="truncate">{s.service}</span><span className="font-medium">{s.count}</span></p>)}
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 px-5 py-3 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400 font-semibold bg-gray-50">
                    <div className="col-span-5">Program</div><div className="col-span-2 text-center">Clients</div><div className="col-span-2 text-right">Collected</div><div className="col-span-3 text-right">Potential</div>
                  </div>
                  {earnings.by_service.length === 0 ? <p className="text-sm text-gray-400 px-5 py-6">No earnings yet.</p> : earnings.by_service.map((r) => (
                    <div key={r.service} className="grid grid-cols-12 px-5 py-4 border-b border-gray-100 text-sm items-center">
                      <div className="col-span-5 font-medium text-gray-900 truncate">{r.service}</div>
                      <div className="col-span-2 text-center text-gray-600">{r.clients}</div>
                      <div className="col-span-2 text-right font-semibold text-emerald-600">{fmt(r.collected)}</div>
                      <div className="col-span-3 text-right text-gray-700">{fmt(r.potential)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-12 px-5 py-4 text-sm items-center bg-gray-50 font-bold">
                    <div className="col-span-5 text-gray-900">Total</div><div className="col-span-2 text-center text-gray-600">{earnings.client_count}</div>
                    <div className="col-span-2 text-right text-emerald-600">{fmt(earnings.collected)}</div><div className="col-span-3 text-right text-gray-900">{fmt(earnings.potential)}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mark fees paid from the Clients tab to update collected earnings.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
