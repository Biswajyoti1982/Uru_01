import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, CATEGORY_COLORS } from "@/lib/exerciseLibrary";
import { Plus, X, Trash2, Dumbbell, CheckCircle2 } from "lucide-react";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function SessionLogDialog({ booking, open, onClose }) {
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState([]); // [{name, category}]
  const [activeCat, setActiveCat] = useState(EXERCISE_LIBRARY[0].category);
  const [customName, setCustomName] = useState("");
  const [customCat, setCustomCat] = useState("Other");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!booking) return;
    try { setLogs((await api.get(`/provider/bookings/${booking.id}/sessions`)).data); } catch { /* noop */ }
  };
  useEffect(() => { if (open && booking) { load(); setDate(todayIso()); setTitle(""); setPicked([]); } }, [open, booking]);

  if (!booking) return null;

  const has = (name) => picked.some((p) => p.name === name);
  const toggle = (name, category) => setPicked((p) => (has(name) ? p.filter((x) => x.name !== name) : [...p, { name, category }]));
  const addCustom = () => {
    const n = customName.trim();
    if (!n) return;
    if (has(n)) return toast.error("Already added");
    setPicked((p) => [...p, { name: n, category: customCat }]);
    setCustomName("");
  };

  const save = async () => {
    if (picked.length === 0) return toast.error("Add at least one exercise");
    setBusy(true);
    try {
      await api.post(`/provider/bookings/${booking.id}/sessions`, { date, title, exercises: picked });
      toast.success("Session logged");
      setPicked([]); setTitle("");
      await load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const removeLog = async (id) => {
    await api.delete(`/provider/sessions/${id}`);
    toast.success("Session removed");
    load();
  };

  const catExercises = EXERCISE_LIBRARY.find((c) => c.category === activeCat)?.exercises || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-[#0F1420] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-white flex items-center gap-2"><Dumbbell className="h-5 w-5 text-[#F97316]" /> Log session</DialogTitle>
          <DialogDescription className="text-xs text-gray-400">{booking.customer_name} · {booking.service_title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Session date</label>
              <input data-testid="session-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full text-sm border border-white/10 bg-white/5 text-white rounded-xl px-3 py-2.5 outline-none focus:border-[#F97316]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Title (optional)</label>
              <input data-testid="session-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Push day" className="w-full text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2.5 outline-none focus:border-[#F97316]" />
            </div>
          </div>

          {/* Picked */}
          <div className="border border-white/10 rounded-xl p-3">
            <p className="text-xs font-semibold text-white mb-2">Exercises ({picked.length})</p>
            {picked.length === 0 ? <p className="text-xs text-gray-500">Pick from the library or add your own below.</p> : (
              <div className="flex flex-wrap gap-1.5">
                {picked.map((p) => (
                  <span key={p.name} data-testid={`picked-${p.name}`} className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: `${CATEGORY_COLORS[p.category] || "#9CA3AF"}22`, color: CATEGORY_COLORS[p.category] || "#9CA3AF" }}>
                    {p.name}<button onClick={() => toggle(p.name, p.category)}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Library picker */}
          <div className="border border-white/10 rounded-xl p-3">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
              {EXERCISE_LIBRARY.map((c) => (
                <button key={c.category} data-testid={`cat-${c.category}`} onClick={() => setActiveCat(c.category)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCat === c.category ? "bg-[#F97316] text-white" : "bg-white/10 text-gray-400"}`}>{c.category}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {catExercises.map((ex) => (
                <button key={ex} data-testid={`ex-${ex}`} onClick={() => toggle(ex, activeCat)} className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${has(ex) ? "bg-[#F97316] text-white border-[#F97316]" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>{has(ex) ? "✓ " : "+ "}{ex}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input data-testid="custom-exercise-input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Custom exercise" className="flex-1 text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2 outline-none focus:border-[#F97316]" />
              <select data-testid="custom-exercise-cat" value={customCat} onChange={(e) => setCustomCat(e.target.value)} className="text-sm border border-white/10 bg-white/5 text-white rounded-xl px-2 py-2 outline-none focus:border-[#F97316]">
                {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button data-testid="add-custom-exercise" onClick={addCustom} className="rounded-xl bg-[#F97316]/10 text-[#F97316] px-3"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <button data-testid="save-session-log" onClick={save} disabled={busy} className="w-full h-11 rounded-full bg-[#F97316] text-white font-semibold disabled:opacity-50 active:scale-95 transition-transform">{busy ? "Saving…" : "Save session"}</button>

          {/* Existing logs */}
          {logs.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-400 mb-2">Logged sessions</p>
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} data-testid={`log-${l.id}`} className="rounded-xl border border-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white flex items-center gap-1.5">{l.title} <span className="text-xs text-gray-500">· {fmtDate(l.date)}</span></p>
                      <div className="flex items-center gap-2">
                        {l.status === "completed" && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> attended</span>}
                        <button data-testid={`del-log-${l.id}`} onClick={() => removeLog(l.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(l.exercises || []).map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CATEGORY_COLORS[e.category] || "#9CA3AF"}22`, color: CATEGORY_COLORS[e.category] || "#9CA3AF" }}>{e.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
