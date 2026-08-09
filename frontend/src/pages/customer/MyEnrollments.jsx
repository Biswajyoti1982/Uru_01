import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/Shared";
import { CalendarCheck, Clock, Calendar, X } from "lucide-react";

const fmtDate = (d) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return d; }
};

export default function MyEnrollments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/enrollments/me");
      setItems(res.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    try {
      await api.delete(`/enrollments/${id}`);
      toast.success("Enrollment cancelled");
      load();
    } catch { toast.error("Could not cancel"); }
  };

  return (
    <div>
      <PageHeader title="My Classes" subtitle="Your upcoming sessions" />
      <div className="p-8">
        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No enrollments yet"
            desc="Browse activities and reserve your spot."
            action={<button data-testid="empty-browse-button" onClick={() => navigate("/app/browse")} className="bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-[#32E612] transition-colors">Browse Activities</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((e) => (
              <div key={e.id} data-testid={`enrollment-${e.id}`} className="border border-white/10 bg-[#141414] p-5 border-l-2 border-l-[#39FF14]">
                <span className="text-[10px] uppercase tracking-widest text-[#39FF14]">{e.service_title}</span>
                <h3 className="font-display text-2xl uppercase tracking-tight font-bold mt-1">{e.class_title}</h3>
                <div className="flex flex-col gap-1 mt-3 text-xs text-white/50 uppercase tracking-wider">
                  <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {fmtDate(e.class_date)}</span>
                  <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {e.class_start} – {e.class_end}</span>
                </div>
                <button
                  data-testid={`cancel-enrollment-${e.id}`}
                  onClick={() => cancel(e.id)}
                  className="w-full mt-4 border border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/40 py-2 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
