import React from "react";
import { motion } from "framer-motion";
import { Dumbbell, Trophy, HeartPulse, ArrowRight, CalendarCheck, ShieldCheck, Users } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const login = () => {
  const redirectUrl = window.location.origin + "/app";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

const CategoryCard = ({ icon: Icon, title, img, desc }) => (
  <div className="group relative overflow-hidden border border-white/10 bg-[#141414]">
    <div className="absolute inset-0">
      <img src={img} alt={title} className="h-full w-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/70 to-transparent" />
    </div>
    <div className="relative p-8 h-72 flex flex-col justify-end">
      <Icon className="h-8 w-8 text-[#39FF14] mb-4" />
      <h3 className="font-display text-3xl uppercase tracking-tight font-bold">{title}</h3>
      <p className="text-white/60 text-sm mt-2">{desc}</p>
    </div>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-[#39FF14] flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-black" />
            </div>
            <span className="font-display text-2xl font-black uppercase tracking-tighter">FitConnect</span>
          </div>
          <button
            data-testid="nav-login-button"
            onClick={login}
            className="bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs px-5 py-2.5 hover:bg-[#32E612] transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?crop=entropy&cs=srgb&fm=jpg&q=85"
            alt="training"
            className="h-full w-full object-cover grayscale opacity-40"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-32 md:py-44">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <span className="text-xs uppercase tracking-[0.3em] text-[#39FF14]">Train / Coach / Compete</span>
            <h1 className="font-display text-5xl md:text-7xl uppercase tracking-tighter font-black mt-4 leading-[0.95]">
              Book elite classes <span className="text-[#39FF14]">from real pros</span>
            </h1>
            <p className="text-white/70 text-lg mt-6 max-w-xl">
              Discover gym training, sports coaching and wellness sessions. See live schedules and enroll in seconds — all in one command center.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <button
                data-testid="hero-get-started-button"
                onClick={login}
                className="group bg-[#39FF14] text-black font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-[#32E612] transition-colors flex items-center gap-2"
              >
                Get Started <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                data-testid="hero-provider-button"
                onClick={login}
                className="border border-white/20 text-white font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-white/10 transition-colors"
              >
                Offer Your Classes
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-tight font-bold">Explore activities</h2>
          <span className="text-xs uppercase tracking-[0.2em] text-white/40 hidden md:block">3 core disciplines</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CategoryCard icon={Dumbbell} title="Gym Training" desc="Strength, conditioning & bootcamps." img="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?crop=entropy&cs=srgb&fm=jpg&q=85" />
          <CategoryCard icon={Trophy} title="Sports Coaching" desc="Tennis, football, technical drills." img="https://images.unsplash.com/photo-1545151414-8a948e1ea54f?crop=entropy&cs=srgb&fm=jpg&q=85" />
          <CategoryCard icon={HeartPulse} title="Wellness & Other" desc="Yoga, mobility & recovery flows." img="https://images.unsplash.com/photo-1651077837628-52b3247550ae?crop=entropy&cs=srgb&fm=jpg&q=85" />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-6 py-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Users, t: "Providers register", d: "Coaches apply and get verified by an admin before going live." },
            { icon: CalendarCheck, t: "Schedules go live", d: "Approved providers publish class schedules with capacity." },
            { icon: ShieldCheck, t: "You enroll", d: "Browse admin-approved classes and reserve your spot instantly." },
          ].map((s, i) => (
            <div key={i} className="border border-white/10 bg-[#141414] p-8">
              <span className="font-display text-5xl font-black text-[#39FF14]">0{i + 1}</span>
              <s.icon className="h-6 w-6 text-white/40 mt-4" />
              <h3 className="font-display text-2xl uppercase tracking-tight font-bold mt-4">{s.t}</h3>
              <p className="text-white/60 text-sm mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-sm">
          <span className="font-display text-xl uppercase tracking-tighter font-bold text-white">FitConnect</span>
          <span>© 2026 FitConnect. Train with the best.</span>
        </div>
      </footer>
    </div>
  );
}
