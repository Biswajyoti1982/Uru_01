import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ExercisePicker from "@/provider/ExercisePicker";
import { CATEGORY_COLORS } from "@/lib/exerciseLibrary";
import { CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, ChevronDown } from "lucide-react";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = (base) => { const x = new Date(base); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekPlanDialog({ booking, open, onClose }) {
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [logs, setLogs] = useState([]);
  const [plan, setPlan] = useState({}); // { dateIso: { title, picked: [] } }
  const [openDay, setOpenDay] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!booking) return;
    try { setLogs((await api.get(`/provider/bookings/${booking.id}/sessions`)).data); } catch { /* noop */ }
  };
  useEffect(() => { if (open && booking) { load(); setPlan({}); setOpenDay(null); setWeekStart(mondayOf(new Date())); } }, [open, booking]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const logByDate = useMemo(() => { const m = {}; logs.forEach((l) => { (m[l.date] = m[l.date] || []).push(l); }); return m; }, [logs]);
  const todayIso = iso(new Date());

  if (!booking) return null;

  const setDayTitle = (d, v) => setPlan((p) => ({ ...p, [d]: { ...(p[d] || { picked: [] }), title: v } }));
  const setDayPicked = (d, picked) => setPlan((p) => ({ ...p, [d]: { ...(p[d] || { title: "" }), picked } }));
  const clearDay = (d) => setPlan((p) => { const n = { ...p }; delete n[d]; return n; });

  const plannedCount = Object.values(plan).filter((v) => v.picked?.length).length;

  const save = async () => {
    const sessions = Object.entries(plan)
      .filter(([, v]) => v.picked?.length)
      .map(([date, v]) => ({ date, title: v.title || "Training session", exercises: v.picked }));
    if (sessions.length === 0) return toast.error("Add exercises to at least one day");
    setBusy(true);
    try {
      const r = await api.post(`/provider/bookings/${booking.id}/sessions/bulk`, { sessions });
      toast.success(`${r.data.created} session${r.data.created !== 1 ? "s" : ""} planned`);
      setPlan({}); setOpenDay(null);
      await load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const removeLog = async (id) => { await api.delete(`/provider/sessions/${id}`); toast.success("Session removed"); load(); };

  const rangeLabel = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-[#0F1420] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-white flex items-center gap-2"><CalendarRange className="h-5 w-5 text-[#F97316]" /> Plan the week</DialogTitle>
          <DialogDescription className="text-xs text-gray-400">{booking.customer_name} · {booking.service_title}</DialogDescription>
        </DialogHeader>

        {/* Week nav */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl px-2 py-2">
          <button data-testid="week-prev" onClick={() => setWeekStart(addDays(weekStart, -7))} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"><ChevronLeft className="h-4 w-4 text-gray-300" /></button>
          <span className="text-sm font-semibold text-white">{rangeLabel}</span>
          <button data-testid="week-next" onClick={() => setWeekStart(addDays(weekStart, 7))} className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center"><ChevronRight className="h-4 w-4 text-gray-300" /></button>
        </div>

        <div className="space-y-2 mt-1">
          {days.map((d, i) => {
            const di = iso(d);
            const existing = logByDate[di] || [];
            const dayPlan = plan[di];
            const isOpen = openDay === di;
            const pickedCount = dayPlan?.picked?.length || 0;
            return (
              <div key={di} data-testid={`week-day-${di}`} className={`rounded-xl border ${isOpen ? "border-[#F97316]/40" : "border-white/10"} overflow-hidden`}>
                <button type="button" onClick={() => setOpenDay(isOpen ? null : di)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                  <div className="text-center w-10 shrink-0">
                    <p className="text-[10px] uppercase text-gray-500">{WD[i]}</p>
                    <p className={`text-lg font-bold leading-none ${di === todayIso ? "text-[#F97316]" : "text-white"}`}>{d.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {existing.length > 0 ? (
                      <p className="text-xs text-gray-400 truncate">{existing.map((e) => e.title).join(", ")}</p>
                    ) : pickedCount > 0 ? (
                      <p className="text-xs text-[#F97316] font-medium">{dayPlan.title || "Training session"} · {pickedCount} exercise{pickedCount !== 1 ? "s" : ""}</p>
                    ) : (
                      <p className="text-xs text-gray-500">Rest day — tap to plan</p>
                    )}
                  </div>
                  {existing.length > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  <ChevronDown className={`h-4 w-4 text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 border-t border-white/10 pt-3 space-y-3">
                    {/* Existing sessions this day */}
                    {existing.map((l) => (
                      <div key={l.id} data-testid={`week-existing-${l.id}`} className="rounded-lg bg-white/5 p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-200 flex items-center gap-1.5">{l.title}{l.status === "completed" && <span className="text-[10px] text-emerald-400">· attended</span>}</p>
                          <button data-testid={`week-del-${l.id}`} onClick={() => removeLog(l.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(l.exercises || []).map((e, k) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CATEGORY_COLORS[e.category] || "#9CA3AF"}22`, color: CATEGORY_COLORS[e.category] || "#9CA3AF" }}>{e.name}</span>)}
                        </div>
                      </div>
                    ))}

                    {/* New plan for this day */}
                    <input data-testid={`week-title-${di}`} value={dayPlan?.title || ""} onChange={(e) => setDayTitle(di, e.target.value)} placeholder="Session title (e.g. Push day)" className="w-full text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2 outline-none focus:border-[#F97316]" />
                    <ExercisePicker picked={dayPlan?.picked || []} setPicked={(p) => setDayPicked(di, p)} />
                    {pickedCount > 0 && <button data-testid={`week-clear-${di}`} onClick={() => clearDay(di)} className="text-xs text-gray-400 hover:text-red-400">Clear this day</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button data-testid="save-week-plan" onClick={save} disabled={busy || plannedCount === 0} className="w-full h-11 rounded-full bg-[#F97316] text-white font-semibold disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2 mt-2">
          <Plus className="h-4 w-4" /> {busy ? "Saving…" : `Plan ${plannedCount || ""} session${plannedCount !== 1 ? "s" : ""}`}
        </button>
      </DialogContent>
    </Dialog>
  );
}
