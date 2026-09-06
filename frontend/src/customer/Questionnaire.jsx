import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Zap, Flame, PersonStanding, Footprints, HeartPulse, User, Users, Shuffle, MapPin, Laptop, Globe, ArrowRight, Loader2, Check } from "lucide-react";

const GOALS = [
  { id: "build_muscle", icon: Dumbbell, title: "Build Muscle & Definition", desc: "Hypertrophy, body sculpting, targeted muscle gain" },
  { id: "strength", icon: Zap, title: "Increase Strength & Power", desc: "Heavy compound lifting, progressive overload, max force" },
  { id: "fat_loss", icon: Flame, title: "Fat Loss & Recomposition", desc: "Calorie burn, lean muscle retention, weight management" },
  { id: "mobility", icon: PersonStanding, title: "Mobility & Functional Health", desc: "Joint longevity, posture correction, core stability" },
  { id: "endurance", icon: Footprints, title: "Endurance & Athleticism", desc: "Stamina, high-intensity conditioning, sports prep" },
  { id: "rehab", icon: HeartPulse, title: "Post-Rehab & Injury Care", desc: "Low-impact movement, pain-free recovery, joint care" },
];
const FORMATS = [
  { id: "individual", icon: User, title: "1-on-1 Individual Sessions", desc: "Dedicated coaching built entirely around your targets" },
  { id: "group", icon: Users, title: "Small Group / Community", desc: "High energy, team environment, shared accountability" },
  { id: "hybrid", icon: Shuffle, title: "Flexible / Hybrid", desc: "Mix 1-on-1 sessions with group workouts" },
];
const MODES = [
  { id: "in_person", icon: MapPin, title: "In-Person", desc: "Train at a partner gym, private studio, or home setup" },
  { id: "virtual", icon: Laptop, title: "Virtual / Online", desc: "Live video coaching and custom app-based routines" },
  { id: "hybrid", icon: Globe, title: "Hybrid Model", desc: "In-person form checks combined with remote programming" },
];
const LEVELS = [
  { id: "Beginner", dot: "#22C55E", title: "Beginner", desc: "New to structured lifting or returning after a long break" },
  { id: "Intermediate", dot: "#EAB308", title: "Intermediate", desc: "Consistently training 2–3x/week for 6+ months" },
  { id: "Advanced", dot: "#EF4444", title: "Advanced", desc: "Experienced with progressive overload and complex lifts" },
];
const FREQ = ["1–2 Days/Week", "3–4 Days/Week", "5+ Days/Week"];

const STEPS = [
  { key: "goal", header: "What would you like to achieve?", sub: "Select your primary focus to calibrate your personalized regimen.", cards: GOALS },
  { key: "format", header: "How do you prefer to train?", sub: "Choose the coaching dynamic that drives you best.", cards: FORMATS },
  { key: "mode", header: "Where will your sessions take place?", sub: "We'll pair you with local facilities or online trainers.", cards: MODES },
];

const Card = ({ item, active, onClick, testid }) => {
  const Icon = item.icon;
  return (
    <motion.button
      type="button" data-testid={testid} onClick={onClick}
      whileTap={{ scale: 0.97 }}
      animate={active ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`w-full text-left rounded-2xl border p-3.5 flex items-center gap-3 transition-colors ${active ? "border-[#F97316] bg-[#F97316]/8 ring-1 ring-[#F97316]" : "border-gray-200 bg-white"}`}
    >
      {Icon && <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-[#F97316] text-white" : "bg-gray-100 text-gray-600"}`}><Icon className="h-5 w-5" /></div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
        <p className="text-xs text-gray-500 leading-snug">{item.desc}</p>
      </div>
      {active && <Check className="h-4 w-4 text-[#F97316] shrink-0" />}
    </motion.button>
  );
};

export default function Questionnaire({ onComplete }) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState({ goal: "", format: "", mode: "", experience: "", frequency: "" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setAns((a) => ({ ...a, [k]: v }));
  const isLast = step === 3;
  const stepValid = step < 3 ? !!ans[STEPS[step].key] : !!ans.experience && !!ans.frequency;

  const next = () => {
    if (!stepValid) return;
    if (!isLast) return setStep(step + 1);
    setLoading(true);
    setTimeout(() => onComplete(ans), 1600);
  };

  if (loading) {
    return (
      <div data-testid="quiz-loading" className="rounded-3xl border border-gray-100 bg-white shadow-sm p-10 flex flex-col items-center text-center">
        <Loader2 className="h-9 w-9 text-[#F97316] animate-spin" />
        <p className="font-display text-lg font-bold text-gray-900 mt-4">Customizing your program…</p>
        <p className="text-xs text-gray-500 mt-1">Matching you with the right trainers.</p>
      </div>
    );
  }

  const cfg = STEPS[step];
  return (
    <div data-testid="questionnaire" className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 pt-4">
        <div className="flex gap-1.5 mb-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[#F97316]" : i < step ? "w-4 bg-[#F97316]/50" : "w-4 bg-gray-200"}`} />)}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="px-4 pb-4">
          {step < 3 ? (
            <>
              <h2 className="font-display text-xl font-bold text-gray-900">{cfg.header}</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">{cfg.sub}</p>
              <div className="space-y-2.5">
                {cfg.cards.map((item) => (
                  <Card key={item.id} item={item} active={ans[cfg.key] === item.id} onClick={() => set(cfg.key, item.id)} testid={`quiz-${cfg.key}-${item.id}`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-gray-900">Where are you starting from?</h2>
              <p className="text-xs text-gray-500 mt-1 mb-4">Helps us tune intensity levels, volume, and rest intervals.</p>
              <div className="space-y-2.5">
                {LEVELS.map((item) => (
                  <Card key={item.id} item={{ ...item, icon: null }} active={ans.experience === item.id} onClick={() => set("experience", item.id)} testid={`quiz-experience-${item.id}`} />
                ))}
              </div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mt-5 mb-2">Target frequency</p>
              <div className="flex gap-2">
                {FREQ.map((fq) => (
                  <button key={fq} type="button" data-testid={`quiz-freq-${fq}`} onClick={() => set("frequency", fq)} className={`flex-1 px-2 py-2.5 rounded-xl text-xs font-medium border transition-colors ${ans.frequency === fq ? "bg-[#F97316] text-white border-[#F97316]" : "border-gray-200 text-gray-600"}`}>{fq}</button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-3">
        {step > 0 && <button type="button" data-testid="quiz-back" onClick={() => setStep(step - 1)} className="text-sm font-medium text-gray-500 px-3 py-2">Back</button>}
        <button
          type="button" data-testid="quiz-continue" onClick={next} disabled={!stepValid}
          className={`flex-1 h-11 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${stepValid ? "bg-[#F97316] text-white shadow-lg shadow-[#F97316]/30" : "bg-gray-200 text-gray-400"}`}
        >
          {isLast ? "See my matches" : "Continue"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
