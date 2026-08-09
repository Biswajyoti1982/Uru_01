import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Star, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
export default function Home() {
  const [services, setServices] = useState([]);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, catMeta } = useCategories();

  useEffect(() => {
    api.get("/services", { params: active ? { category: active } : {} }).then((r) => setServices(r.data));
  }, [active]);

  const filtered = services.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  const minPrice = (s) => (s.items?.length ? Math.min(...s.items.map((i) => i.price)) : 0);

  return (
    <div>
      {/* Header */}
      <div className="bg-[#6D28D9] text-white px-5 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/70 flex items-center gap-1"><MapPin className="h-3 w-3" /> Deliver to</p>
            <p className="text-sm font-semibold">Mumbai, India</p>
          </div>
          <button
            data-testid="home-avatar"
            onClick={() => navigate("/app/account")}
            className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold active:scale-95 transition-transform"
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </button>
        </div>
        <h1 className="font-display text-2xl font-bold mt-4 leading-snug">
          Hi {user?.name?.split(" ")[0] || "there"}, what would you like to learn today?
        </h1>
        <div className="mt-4 bg-white rounded-2xl flex items-center gap-2 px-4 h-12">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            data-testid="home-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gym, karate, cricket…"
            className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-gray-900">Categories</h2>
          {active && (
            <button data-testid="clear-category" onClick={() => setActive("")} className="text-xs font-medium text-[#6D28D9]">Clear</button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((c) => {
            const on = active === c.id;
            return (
              <button
                key={c.id}
                data-testid={`category-${c.id}`}
                onClick={() => setActive(on ? "" : c.id)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${on ? "border-[#6D28D9] ring-2 ring-[#6D28D9]/30" : "border-transparent"}`}
                  style={{ background: `${c.color}18` }}
                >
                  <c.icon className="h-6 w-6" style={{ color: c.color }} />
                </div>
                <span className="text-[10px] text-gray-600 font-medium text-center leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-gray-900">
            {active ? catMeta(active).label : "Popular near you"}
          </h2>
        </div>
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">No services found.</p>
          )}
          {filtered.map((s, i) => (
            <motion.button
              key={s.id}
              data-testid={`service-card-${s.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/service/${s.id}`)}
              className="w-full text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="h-40 w-full overflow-hidden bg-gray-100">
                <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${catMeta(s.category).color}18`, color: catMeta(s.category).color }}>
                    {catMeta(s.category).label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.8
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-gray-900 mt-2">{s.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {s.location} · {s.provider_name}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-sm text-gray-900 font-semibold">
                    From {fmt(minPrice(s))}/mo
                  </p>
                  <span className="text-sm font-semibold text-[#6D28D9] flex items-center">
                    View <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
