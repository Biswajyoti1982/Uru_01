import React from "react";
import { motion } from "framer-motion";
import { Dumbbell, HeartPulse, Trophy, Star } from "lucide-react";
import { UruLogo } from "@/components/UruLogo";
import AuthPanel from "@/components/AuthPanel";

export default function URULanding() {
  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white sm:border-x sm:border-gray-200 flex flex-col relative overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
            alt="Gym trainer coaching a client"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/80 via-[#111827]/75 to-[#111827]/95" />
        </div>
        <div className="relative px-6 pt-14 pb-16 text-white">
          <div className="flex items-center gap-2.5">
            <UruLogo size={48} />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl font-bold leading-tight mt-10"
          >
            Find your perfect <span className="text-[#F97316]">gym trainer</span>
          </motion.h1>
          <p className="text-white/85 mt-4 text-[15px] leading-relaxed">
            Certified gym trainers near you — personal, small-group and online coaching, booked in seconds.
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
            { icon: Dumbbell, label: "Strength", c: "#F97316" },
            { icon: HeartPulse, label: "Fat Loss", c: "#EF4444" },
            { icon: Trophy, label: "Performance", c: "#F59E0B" },
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

      {/* Auth */}
      <div className="px-6 pb-10 pt-8">
        <AuthPanel />
      </div>
    </div>
  );
}
