import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { categoryLabel } from "@/lib/categories";
import { PageHeader } from "@/components/Shared";
import { ArrowLeft, MapPin, Signal, Clock, Calendar, Users } from "lucide-react";

const fmtDate = (d) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return d; }
};

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [svc, setSvc] = useState(null);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState("");

  const load = async () => {
    const [s, e] = await Promise.all([api.get(`/services/${id}`), api.get("/enrollments/me")]);
    setSvc(s.data);
    setMine(e.data.map((x) => x.class_id));
  };
  useEffect(() => { load(); }, [id]);

  const enroll = async (classId) => {
    setBusy(classId);
    try {
      await api.post("/enrollments", { class_id: classId });
      toast.success("Enrolled! See it under My Classes.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not enroll");
    } finally {
      setBusy("");
    }
  };

  if (!svc) return <div className="p-8 text-white/40 uppercase tracking-widest text-xs">Loading…</div>;

  return (
    <div>
      <PageHeader title={svc.title} subtitle={categoryLabel(svc.category)}>
        <button data-testid="back-button" onClick={() => navigate(-1)} className="border border-white/20 text-white/70 hover:bg-white/10 px-4 py-2 text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      </PageHeader>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {svc.image_url && (
            <div className="h-72 overflow-hidden border border-white/10 mb-6">
              <img src={svc.image_url} alt={svc.title} className="h-full w-full object-cover" />
            </div>
          )}
          <p className="text-white/70 text-base leading-relaxed">{svc.description}</p>
          <div className="flex flex-wrap gap-6 mt-6 text-sm text-white/50 uppercase tracking-wider">
            <span className="flex items-center gap-2"><Signal className="h-4 w-4 text-[#39FF14]" /> {svc.level}</span>
            {svc.location && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#39FF14]" /> {svc.location}</span>}
            <span>by {svc.provider_name}</span>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl uppercase tracking-tight font-bold mb-4">Schedule</h2>
          {svc.classes.length === 0 ? (
            <p className="text-white/40 text-sm">No classes scheduled yet.</p>
          ) : (
            <div className="space-y-3">
              {svc.classes.map((cl) => {
                const full = cl.enrolled_count >= cl.capacity;
                const enrolled = mine.includes(cl.id);
                return (
                  <div key={cl.id} data-testid={`class-slot-${cl.id}`} className="border border-white/10 bg-[#141414] p-4 border-l-2 border-l-[#39FF14]">
                    <p className="font-medium">{cl.title}</p>
                    <div className="flex flex-col gap-1 mt-2 text-xs text-white/50 uppercase tracking-wider">
                      <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {fmtDate(cl.date)}</span>
                      <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {cl.start_time} – {cl.end_time}</span>
                      <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {cl.enrolled_count}/{cl.capacity} spots</span>
                    </div>
                    <button
                      data-testid={`enroll-button-${cl.id}`}
                      disabled={enrolled || full || busy === cl.id}
                      onClick={() => enroll(cl.id)}
                      className={`w-full mt-3 py-2.5 text-xs uppercase tracking-widest font-bold transition-colors ${
                        enrolled ? "bg-white/10 text-white/50 cursor-default"
                        : full ? "bg-white/5 text-white/30 cursor-not-allowed"
                        : "bg-[#39FF14] text-black hover:bg-[#32E612]"
                      }`}
                    >
                      {enrolled ? "Enrolled" : full ? "Full" : busy === cl.id ? "…" : "Enroll"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
