import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { fmt } from "@/lib/format";
import { Star, Award, User, ShieldCheck, BadgeCheck, Languages, Pencil, Store, CalendarDays, Users, ArrowRight } from "lucide-react";
import { FOCUS_AREAS, BATCH_TYPES } from "@/lib/trainerOptions";

const FOCUS_LABEL = Object.fromEntries(FOCUS_AREAS.map((o) => [o.id, o.label]));
const BATCH_LABEL = Object.fromEntries(BATCH_TYPES.map((o) => [o.id, o.label]));
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const Section = ({ title, onEdit, children, testid }) => (
  <div data-testid={testid} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-base font-bold text-white">{title}</h2>
      {onEdit && (
        <button data-testid={`${testid}-edit`} onClick={onEdit} className="text-xs font-semibold text-[#F97316] flex items-center gap-1 hover:underline">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      )}
    </div>
    {children}
  </div>
);

const Chip = ({ children }) => <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 text-gray-300">{children}</span>;

export default function ProviderOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [calendar, setCalendar] = useState([]);

  useEffect(() => {
    api.get("/provider/services").then((r) => setServices(r.data)).catch(() => {});
    api.get("/provider/calendar", { params: { days: 30 } }).then((r) => setCalendar(r.data)).catch(() => {});
  }, []);

  if (!user) return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  const editProfile = () => navigate("/manage/provider/profile");
  const avatar = user.avatar_url || user.picture;
  const upcoming = calendar.filter((d) => d.sessions > 0);
  const monthTotal = upcoming.reduce((a, d) => a + d.sessions, 0);

  return (
    <div>
      <div className="bg-[#0F1420] border-b border-white/10 px-4 sm:px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-white">Home</h1>
        <p className="text-sm text-gray-400">This is how customers see you — keep it sharp.</p>
      </div>

      <div className="p-4 sm:p-8 max-w-3xl space-y-5">
        {/* Profile card (customer view) */}
        <Section title="Public profile" onEdit={editProfile} testid="ov-profile">
          <div className="flex gap-4">
            <img src={avatar} alt="" className="h-20 w-20 rounded-2xl object-cover bg-white/10 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display text-lg font-bold text-white truncate">{user.business_name || user.name}</h3>
                {user.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {user.rating || 4.7}</span>
                <span className="flex items-center gap-1"><Award className="h-4 w-4" /> {user.experience_years || 0}+ yrs</span>
                {(user.age > 0 || user.gender) && <span className="flex items-center gap-1"><User className="h-4 w-4" /> {[cap(user.gender), user.age > 0 ? `${user.age} yrs` : ""].filter(Boolean).join(", ")}</span>}
              </div>
            </div>
          </div>
          {user.bio && <p className="text-sm text-gray-400 leading-relaxed mt-3">{user.bio}</p>}
        </Section>

        {/* Languages + specialties */}
        <Section title="Specialties & languages" onEdit={editProfile} testid="ov-specialties">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(user.specialties || []).length ? user.specialties.map((s) => <Chip key={s}>{s}</Chip>) : <p className="text-xs text-gray-500">No specialties added.</p>}
          </div>
          {(user.languages || []).length > 0 && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap"><Languages className="h-4 w-4" /> {user.languages.join(", ")}</p>
          )}
        </Section>

        {/* Certifications */}
        <Section title="Certifications & qualifications" onEdit={editProfile} testid="ov-certs">
          {(user.certifications || []).length ? (
            <div className="space-y-2">{user.certifications.map((c) => <div key={c} className="flex items-center gap-2 text-sm text-gray-300"><BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" /> {c}</div>)}</div>
          ) : <p className="text-xs text-gray-500">No certifications added.</p>}
        </Section>

        {/* Services */}
        <Section title="My services" onEdit={() => navigate("/manage/provider/services")} testid="ov-services">
          {services.length === 0 ? (
            <div className="text-center py-6">
              <Store className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No services yet.</p>
              <button onClick={() => navigate("/manage/provider/services")} className="mt-3 rounded-full bg-[#F97316] text-white text-sm font-semibold px-5 py-2">Create a service</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {services.map((s) => (
                <div key={s.id} data-testid={`ov-service-${s.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
                  <div className="h-12 w-12 rounded-xl bg-white/10 overflow-hidden shrink-0">{s.image_url && <img src={s.image_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.items?.length || 0} plans · {s.slots?.length || 0} slots · from {fmt(Math.min(...(s.items?.map((i) => i.price) || [0])))}/mo</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(s.focus_areas || []).slice(0, 3).map((f) => <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316]">{FOCUS_LABEL[f] || f}</span>)}
                      {(s.batch_types || []).slice(0, 2).map((b) => <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{BATCH_LABEL[b] || b}</span>)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${s.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : s.status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-white/10 text-gray-400"}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Monthly session schedule */}
        <Section title="Session schedule — next 30 days" onEdit={() => navigate("/manage/provider/bookings")} testid="ov-schedule">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {monthTotal} session{monthTotal !== 1 ? "s" : ""} scheduled</p>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-500">No sessions scheduled yet. They'll appear here once clients subscribe.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((d) => (
                <div key={d.date} data-testid={`ov-day-${d.date}`} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                  <div className="text-center w-10 shrink-0">
                    <p className="text-[10px] uppercase text-gray-500">{d.weekday}</p>
                    <p className="text-lg font-bold text-white leading-none">{d.day}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gray-500" /> {d.sessions} session{d.sessions !== 1 ? "s" : ""} · {d.clients} client{d.clients !== 1 ? "s" : ""}</p>
                    {d.by_service.length > 0 && <p className="text-[11px] text-gray-500 truncate">{d.by_service.map((x) => `${x.service} (${x.count})`).join(", ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate("/manage/provider/bookings")} className="mt-4 w-full rounded-full border border-white/10 text-gray-300 hover:bg-white/5 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
            Open full calendar & clients <ArrowRight className="h-4 w-4" />
          </button>
        </Section>
      </div>
    </div>
  );
}
