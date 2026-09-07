import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmt, fmtDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { UruLogo } from "@/components/UruLogo";
import { CATEGORY_COLORS } from "@/lib/exerciseLibrary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MapPin, Video, Play, Calendar, ChevronRight, Star, Award, ShieldCheck, Activity, CheckCircle2, CreditCard, Lightbulb, Dumbbell, X, TrendingUp } from "lucide-react";

const weekday = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" }); } catch { return ""; } };

const StatPill = ({ label, value, tone = "white" }) => {
  const tones = { white: "text-gray-900", orange: "text-[#F97316]", green: "text-emerald-600", red: "text-red-500" };
  return (
    <div className="flex-1 text-center">
      <p className={`font-display text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] text-gray-500 font-medium">{label}</p>
    </div>
  );
};

export default function SubscribedHome({ answers }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null); // active in-progress session
  const [done, setDone] = useState({});

  const load = () => api.get("/customer/home", { params: answers?.goal ? { goal: answers.goal } : {} }).then((r) => setData(r.data)).catch(() => setData({ has_subscription: false }));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const startSession = async () => {
    const ts = data?.primary?.today_session;
    if (!ts) return;
    setSession(ts); setDone({});
    if (ts.id) { try { await api.post(`/customer/sessions/${ts.id}/attend`); } catch { /* noop */ } }
  };
  const finishSession = () => { setSession(null); toast.success("Great work! Session complete."); load(); };

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Activity className="h-6 w-6 text-[#F97316] animate-pulse" /></div>;

  const p = data.primary;
  const next = p?.next_session;
  const sum = p?.summary;
  const prog = data.progress;
  const maxWk = prog ? Math.max(1, ...prog.weekly.map((x) => x.completed)) : 1;

  return (
    <div className="pb-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-[#111827] text-white px-5 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UruLogo size={38} />
            <div>
              <p className="text-[11px] text-white/60">Welcome back</p>
              <p className="text-sm font-semibold">{user?.name?.split(" ")[0] || "Athlete"}</p>
            </div>
          </div>
          <button data-testid="home-avatar" onClick={() => navigate("/app/account")} className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center font-semibold active:scale-95 transition-transform">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </button>
        </div>
      </div>

      {p ? (
        <>
          {/* Subscription banner */}
          <div className="px-5 -mt-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="subscription-banner" className="rounded-3xl overflow-hidden shadow-lg bg-white border border-gray-100">
              <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white p-5">
                <div className="flex items-center gap-3">
                  <img src={p.provider_avatar} alt="" className="h-12 w-12 rounded-xl object-cover bg-white/20" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/80">{p.service_title}</p>
                    <p className="font-display text-lg font-bold truncate">{p.provider_name}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase bg-white/20 px-2 py-1 rounded-full">{p.plan_label}</span>
                </div>

                {next?.is_today ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> You have a session today!</p>
                    <button data-testid="start-session-button" onClick={startSession} className="mt-3 w-full h-12 rounded-full bg-white text-[#EA580C] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                      <Play className="h-5 w-5 fill-[#EA580C]" /> Start session
                    </button>
                  </div>
                ) : next ? (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white/20 flex flex-col items-center justify-center leading-none">
                      <span className="text-[9px] uppercase">{weekday(next.date).slice(0, 3)}</span>
                      <span className="text-lg font-bold">{new Date(next.date + "T00:00:00").getDate()}</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/80">Next session</p>
                      <p className="text-sm font-semibold flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmtDate(next.date)} · {p.time_slot}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/90">No upcoming sessions — your plan may have ended.</p>
                )}

                <p className="mt-3 text-xs text-white/80 flex items-center gap-1.5">
                  {p.mode === "virtual" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {p.mode === "virtual" ? "Online session" : (p.society_name || "In-person")}
                </p>
              </div>

              {/* Summary tile */}
              <div data-testid="session-summary" className="p-4">
                <div className="flex items-center divide-x divide-gray-100">
                  <StatPill label="Total" value={sum.total} />
                  <StatPill label="Done" value={sum.completed} tone="green" />
                  <StatPill label="Left" value={sum.left} tone="orange" />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  {sum.payment_status === "paid" ? (
                    <p className="text-xs text-gray-600">
                      <span className="text-emerald-600 font-semibold">Paid</span>
                      {sum.paid_at ? ` on ${fmtDate(sum.paid_at)}` : ""} · Next due <b className="text-gray-900">{fmtDate(sum.next_due)}</b>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600"><span className="text-red-500 font-semibold">Payment due</span> {fmt(sum.amount)} · by <b className="text-gray-900">{fmtDate(sum.next_due)}</b></p>
                  )}
                </div>
              </div>
            </motion.div>
            {data.subscription_count > 1 && (
              <button data-testid="all-subs-link" onClick={() => navigate("/app/bookings")} className="mt-2 text-xs font-semibold text-[#F97316] flex items-center gap-1">View all {data.subscription_count} subscriptions <ChevronRight className="h-3.5 w-3.5" /></button>
            )}
          </div>

          {/* Session tracker */}
          <div className="px-5 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-[#F97316]" />
              <h2 className="font-display text-lg font-bold text-gray-900">Your session tracker</h2>
            </div>
            <div data-testid="session-tracker" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              {data.tracker.length === 0 ? (
                <div className="text-center py-6">
                  <Dumbbell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No sessions logged yet.</p>
                  <p className="text-xs text-gray-400 mt-0.5">Your trainer will record exercises after each session.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">Muscle groups — last {data.tracker.length} session{data.tracker.length > 1 ? "s" : ""}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {data.category_summary.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${CATEGORY_COLORS[c.category] || "#9CA3AF"}18` }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[c.category] || "#9CA3AF" }} />
                        <span className="text-xs font-semibold" style={{ color: CATEGORY_COLORS[c.category] || "#9CA3AF" }}>{c.category}</span>
                        <span className="text-xs text-gray-500">×{c.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    {data.tracker.map((s) => (
                      <div key={s.id} data-testid={`tracker-session-${s.id}`} className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">{s.title} <span className="text-xs text-gray-400 font-normal">· {fmtDate(s.date)}</span></p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {s.exercises.map((e, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${CATEGORY_COLORS[e.category] || "#9CA3AF"}22`, color: CATEGORY_COLORS[e.category] || "#9CA3AF" }}>{e.name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="px-5 mt-6 text-center py-10">
          <p className="text-sm text-gray-500">No active subscription details.</p>
        </div>
      )}

      {/* Progress charts */}
      {prog?.total_completed > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[#F97316]" />
            <h2 className="font-display text-lg font-bold text-gray-900">Your progress</h2>
          </div>
          <div data-testid="progress-charts" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-5">
            {/* Weekly completed trend */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sessions completed / week</p>
                <span className="text-xs text-gray-400">{prog.total_completed} total</span>
              </div>
              <div className="flex items-end justify-between gap-2 h-28">
                {prog.weekly.map((w, i) => (
                  <div key={w.week_start} data-testid={`week-bar-${w.week_start}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[11px] font-semibold text-gray-700 h-3">{w.completed || ""}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((w.completed / maxWk) * 100, 4)}%` }} transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 16 }} className={`w-full rounded-t-lg ${w.completed ? "bg-[#F97316]" : "bg-gray-100"}`} />
                    <span className="text-[10px] text-gray-400">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Muscle-group balance */}
            {prog.muscle_balance.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Muscle-group balance</p>
                <div className="space-y-2.5">
                  {prog.muscle_balance.map((m, i) => (
                    <div key={m.category} data-testid={`balance-${m.category}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-700">{m.category}</span>
                        <span className="text-[11px] text-gray-400">{m.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ delay: i * 0.06, duration: 0.5 }} className="h-full rounded-full" style={{ background: CATEGORY_COLORS[m.category] || "#9CA3AF" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured trainers */}
      {data.featured_trainers?.length > 0 && (
        <div className="mt-6">
          <div className="px-5 flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-gray-900">Featured trainers near you</h2>
            <button data-testid="see-all-trainers" onClick={() => navigate("/app")} className="text-xs font-semibold text-[#F97316]">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x">
            {data.featured_trainers.map((t) => (
              <button key={t.user_id} data-testid={`featured-${t.user_id}`} onClick={() => navigate(`/app/provider/${t.user_id}`)} className="snap-start shrink-0 w-40 text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform">
                <img src={t.avatar_url} alt="" className="h-24 w-full object-cover bg-gray-100" />
                <div className="p-3">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{t.business_name}</p>
                    {t.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5"><Award className="h-3 w-3" /> {t.experience_years}+ yrs</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-semibold text-gray-900">{fmt(t.price_from)}/mo</span>
                    <span className="flex items-center gap-0.5 text-[11px] text-gray-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {t.rating}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Health tips */}
      {data.tips?.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#F97316]" />
            <h2 className="font-display text-lg font-bold text-gray-900">Health tips for you</h2>
          </div>
          <div className="space-y-2.5">
            {data.tips.map((tip, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`tip-${i}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#F97316]/10 flex items-center justify-center shrink-0"><Lightbulb className="h-4 w-4 text-[#F97316]" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{tip.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tip.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Session in progress */}
      <Dialog open={!!session} onOpenChange={(v) => !v && setSession(null)}>
        <DialogContent className="max-w-md bg-[#0F1420] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-white flex items-center gap-2"><Play className="h-5 w-5 text-[#F97316] fill-[#F97316]" /> Session in progress</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">{session?.title || "Training session"} · {p?.provider_name}</DialogDescription>
          </DialogHeader>
          {session && (
            <div className="space-y-3">
              {session.exercises.length === 0 ? (
                <div className="text-center py-6">
                  <Dumbbell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">Your trainer hasn't added exercises for today.</p>
                  <p className="text-xs text-gray-500 mt-1">Enjoy your session — it's marked as attended.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {session.exercises.map((e, i) => (
                    <button key={i} data-testid={`inprogress-ex-${i}`} onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))} className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${done[i] ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${done[i] ? "bg-emerald-500 text-white" : "border border-white/20 text-transparent"}`}><CheckCircle2 className="h-4 w-4" /></div>
                      <div>
                        <p className={`text-sm font-medium ${done[i] ? "text-emerald-400 line-through" : "text-white"}`}>{e.name}</p>
                        <p className="text-[11px]" style={{ color: CATEGORY_COLORS[e.category] || "#9CA3AF" }}>{e.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button data-testid="finish-session-button" onClick={finishSession} className="w-full h-11 rounded-full bg-[#F97316] text-white font-semibold active:scale-95 transition-transform">Finish session</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
