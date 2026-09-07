import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Star, ChevronRight, Award, ShieldCheck, Sparkles, Eye } from "lucide-react";
import { UruLogo } from "@/components/UruLogo";
import api from "@/lib/api";
import { fmt } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import Questionnaire from "@/customer/Questionnaire";
import SubscribedHome from "@/customer/SubscribedHome";

const GOAL_KEYWORDS = {
  build_muscle: ["muscle", "hypertroph", "bodybuild", "strength", "sculpt"],
  strength: ["strength", "power", "lifting", "crossfit", "conditioning"],
  fat_loss: ["fat", "loss", "recomp", "weight", "conditioning", "cardio"],
  mobility: ["mobility", "functional", "posture", "core", "yoga", "flex"],
  endurance: ["endurance", "athlet", "stamina", "conditioning", "crossfit", "football", "cricket"],
  rehab: ["rehab", "injury", "recovery", "care", "low-impact", "physio"],
};

function scoreProvider(p, ans) {
  if (!ans) return 0;
  let s = 0;
  const specs = (p.specialties || []).map((x) => x.toLowerCase());
  if (ans.goal && (p.focus_areas || []).includes(ans.goal)) s += 4;
  const kw = GOAL_KEYWORDS[ans.goal] || [];
  for (const sp of specs) if (kw.some((k) => sp.includes(k))) s += 2;
  if (ans.format && (p.batch_types || []).includes(ans.format)) s += 2;
  const clvl = (p.client_levels || []).map((x) => x.toLowerCase());
  const levels = (p.experience_levels || []).map((x) => x.toLowerCase());
  if (ans.experience) {
    const e = ans.experience.toLowerCase();
    if (clvl.includes(e)) s += 2;
    else if (levels.includes(e) || levels.includes("all levels") || levels.includes("all")) s += 1;
  }
  s += (p.rating || 0) / 10;
  return s;
}

const HERO = "https://images.unsplash.com/photo-1648542036561-e1d66a5ae2b1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const TrainerCard = ({ p, onClick, delay = 0 }) => (
  <motion.button
    data-testid={`provider-card-${p.user_id}`}
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    onClick={onClick}
    className="w-full text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.98] transition-transform p-4 flex gap-4"
  >
    <img src={p.avatar_url} alt={p.business_name} className="h-20 w-20 rounded-2xl object-cover shrink-0 bg-gray-100" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <h3 className="font-display text-base font-bold text-gray-900 truncate">{p.business_name}</h3>
        {p.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
        <span className="flex items-center gap-0.5 text-xs text-gray-600 ml-auto shrink-0"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating}</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Award className="h-3 w-3" /> {p.experience_years}+ yrs{p.gender ? ` · ${p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}` : ""}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {(p.specialties || []).slice(0, 3).map((s) => (
          <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F97316]/10 text-[#F97316]">{s}</span>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <p className="text-sm text-gray-900 font-semibold">From {fmt(p.price_from)}/mo</p>
        <span className="text-sm font-semibold text-[#F97316] flex items-center">View <ChevronRight className="h-4 w-4" /></span>
      </div>
    </div>
  </motion.button>
);

export default function Home() {
  const [providers, setProviders] = useState([]);
  const [hasSub, setHasSub] = useState(false);
  const [subLoaded, setSubLoaded] = useState(false);
  const [answers, setAnswers] = useState(() => { try { return JSON.parse(localStorage.getItem("uru_quiz") || "null"); } catch { return null; } });
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("all");
  const [exp, setExp] = useState("all");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const preview = new URLSearchParams(location.search).get("preview") === "1";

  useEffect(() => { api.get("/providers", { params: { category: "gym" } }).then((r) => setProviders(r.data)); }, []);
  useEffect(() => {
    api.get("/bookings/me")
      .then((r) => setHasSub((r.data || []).some((b) => b.status !== "cancelled")))
      .catch(() => setHasSub(false))
      .finally(() => setSubLoaded(true));
  }, []);

  const completeQuiz = (a) => { localStorage.setItem("uru_quiz", JSON.stringify(a)); setAnswers(a); };
  const resetQuiz = () => { localStorage.removeItem("uru_quiz"); setAnswers(null); };
  const showQuiz = !preview && subLoaded && !hasSub && !answers;

  const genderOpts = useMemo(() => ["all", ...Array.from(new Set(providers.flatMap((p) => p.genders || []))).filter((g) => g && g !== "all")], [providers]);
  const expOpts = useMemo(() => ["all", ...Array.from(new Set(providers.flatMap((p) => p.experience_levels || []))).filter((e) => e && !["all", "All levels", "All"].includes(e))], [providers]);

  const ql = q.toLowerCase();
  const filtered = providers.filter((p) => {
    const matchesQ = p.business_name.toLowerCase().includes(ql) || (p.specialties || []).some((s) => s.toLowerCase().includes(ql));
    const matchesG = gender === "all" || (p.genders || []).includes(gender);
    const matchesE = exp === "all" || (p.experience_levels || []).includes(exp);
    return matchesQ && matchesG && matchesE;
  });

  const ranked = useMemo(() => {
    if (!answers) return filtered;
    return [...filtered].sort((a, b) => scoreProvider(b, answers) - scoreProvider(a, answers));
  }, [filtered, answers]);

  const featured = ranked[0];
  const rest = ranked.slice(1);

  // Providers/admins land on their console, unless previewing the customer app.
  if (!preview && user && (user.provider_status === "approved" || user.role === "admin")) {
    return <Navigate to={user.role === "admin" ? "/manage/admin" : "/manage/provider"} replace />;
  }

  // Subscribed customers get the dashboard homepage.
  if (!preview && subLoaded && hasSub) return <SubscribedHome answers={answers} />;

  return (
    <div className="pb-4">
      {preview && (
        <div data-testid="customer-preview-banner" className="sticky top-0 z-[60] bg-[#F97316] text-white text-xs font-medium px-4 py-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Customer preview</span>
          <button data-testid="exit-preview-button" onClick={() => navigate(user?.role === "admin" ? "/manage/admin" : "/manage/provider")} className="font-semibold underline underline-offset-2">Exit preview</button>
        </div>
      )}
      {/* Header */}
      <div className="bg-[#111827] text-white px-5 pt-6 pb-6 rounded-b-3xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${HERO})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/70 to-[#111827]/30" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UruLogo size={40} />
              <div>
                <p className="text-[11px] text-white/60 flex items-center gap-1"><MapPin className="h-3 w-3" /> Mumbai, India</p>
                <p className="text-sm font-semibold">URU Gym Trainers</p>
              </div>
            </div>
            <button data-testid="home-avatar" onClick={() => navigate("/app/account")} className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center font-semibold active:scale-95 transition-transform">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </button>
          </div>
          <h1 className="font-display text-3xl font-bold mt-6 leading-tight max-w-[85%]">
            Find your perfect <span className="text-[#F97316]">gym trainer</span>
          </h1>
          <p className="text-sm text-white/70 mt-1.5">Certified coaches near you. Subscribe monthly, train your way.</p>
          <div className="mt-4 bg-white rounded-2xl flex items-center gap-2 px-4 h-12">
            <Search className="h-4 w-4 text-gray-400" />
            <input data-testid="home-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search trainers, specialties…" className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent" />
          </div>
        </div>
      </div>

      {/* Questionnaire (only for users with no subscription, until completed) */}
      {showQuiz && (
        <div className="px-5 mt-5">
          <Questionnaire onComplete={completeQuiz} />
        </div>
      )}

      {/* Filters */}
      <div className="px-5 mt-5 space-y-3">
        {genderOpts.length > 1 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">For</p>
            <div className="flex gap-2 flex-wrap">
              {genderOpts.map((g) => (
                <button key={g} data-testid={`filter-gender-${g}`} onClick={() => setGender(g)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${gender === g ? "bg-[#F97316] text-white border-[#F97316]" : "border-gray-200 text-gray-600"}`}>{g === "all" ? "Everyone" : g}</button>
              ))}
            </div>
          </div>
        )}
        {expOpts.length > 1 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Experience level</p>
            <div className="flex gap-2 flex-wrap">
              {expOpts.map((e) => (
                <button key={e} data-testid={`filter-exp-${e}`} onClick={() => setExp(e)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${exp === e ? "bg-[#F97316] text-white border-[#F97316]" : "border-gray-200 text-gray-600"}`}>{e === "all" ? "All levels" : e}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Featured */}
      {featured && (
        <div className="px-5 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#F97316]" />
            <h2 className="font-display text-lg font-bold text-gray-900">{answers ? "Your best match" : "Most preferred"}</h2>
            {answers && <button data-testid="quiz-retake" onClick={resetQuiz} className="ml-auto text-xs font-semibold text-[#F97316]">Update preferences</button>}
          </div>
          <TrainerCard p={featured} onClick={() => navigate(`/app/provider/${featured.user_id}`)} />
        </div>
      )}

      {/* All trainers */}
      <div className="px-5 mt-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-3">{answers ? "Other trainers in your area" : "All gym trainers"}</h2>
        <div className="space-y-4">
          {filtered.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No trainers match your filters.</p>}
          {rest.map((p, i) => (
            <TrainerCard key={p.user_id} p={p} delay={i * 0.05} onClick={() => navigate(`/app/provider/${p.user_id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}
