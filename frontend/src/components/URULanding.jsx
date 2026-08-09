import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Dumbbell, Palette, Swords, ArrowRight, Star } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const login = () => {
  const redirectUrl = window.location.origin + "/app";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function URULanding() {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white sm:border-x sm:border-gray-200 flex flex-col relative overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
            alt="hero"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#6D28D9]/85 via-[#6D28D9]/70 to-[#5B21B6]/95" />
        </div>
        <div className="relative px-6 pt-14 pb-16 text-white">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#6D28D9]" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">URU</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl font-bold leading-tight mt-10"
          >
            Book trusted pros for anything you love
          </motion.h1>
          <p className="text-white/85 mt-4 text-[15px] leading-relaxed">
            Gym, martial arts, cricket, art, music and more — expert-led classes and coaching, booked in seconds.
          </p>
          <div className="flex items-center gap-1.5 mt-5 text-sm text-white/90">
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
            <span className="font-semibold">4.8</span>
            <span className="text-white/70">· 12k+ bookings this month</span>
          </div>
        </div>
      </div>

      {/* Category peek */}
      <div className="px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 p-5 grid grid-cols-3 gap-4">
          {[
            { icon: Dumbbell, label: "Gym", c: "#F97316" },
            { icon: Swords, label: "Martial", c: "#EF4444" },
            { icon: Palette, label: "Art", c: "#8B5CF6" },
          ].map((x) => (
            <div key={x.label} className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${x.c}18` }}>
                <x.icon className="h-6 w-6" style={{ color: x.c }} />
              </div>
              <span className="text-xs font-medium text-gray-600">{x.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      <div className="px-6 pb-10 pt-8">
        <button
          data-testid="landing-login-button"
          onClick={login}
          className="w-full h-14 rounded-full bg-[#6D28D9] text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-[#6D28D9]/25"
        >
          Continue with Google <ArrowRight className="h-5 w-5" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">
          By continuing you agree to URU's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
