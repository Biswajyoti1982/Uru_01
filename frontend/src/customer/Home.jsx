import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin, Star, ChevronRight, Award } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, catMeta } = useCategories();

  useEffect(() => {
    const params = active ? { category: active } : {};
    api.get("/services", { params }).then((r) => setServices(r.data));
    api.get("/providers", { params }).then((r) => setProviders(r.data));
  }, [active]);

  const ql = q.toLowerCase();
  const minPrice = (s) => (s.items?.length ? Math.min(...s.items.map((i) => i.price)) : 0);
  const svcFiltered = services.filter((s) => s.title.toLowerCase().includes(ql) || (s.provider_name || "").toLowerCase().includes(ql));
  const provFiltered = providers.filter(
    (p) => p.business_name.toLowerCase().includes(ql) || (p.specialties || []).some((s) => s.toLowerCase().includes(ql))
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-[#6D28D9] text-white px-5 pt-6 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/70 flex items-center gap-1"><MapPin className="h-3 w-3" /> Deliver to</p>
            <p className="text-sm font-semibold">Mumbai, India</p>
          </div>
          <button data-testid="home-avatar" onClick={() => navigate("/app/account")} className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold active:scale-95 transition-transform">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </button>
        </div>
        <h1 className="font-display text-2xl font-bold mt-4 leading-snug">
          Hi {user?.name?.split(" ")[0] || "there"}, what would you like to learn today?
        </h1>
        <div className="mt-4 bg-white rounded-2xl flex items-center gap-2 px-4 h-12">
          <Search className="h-4 w-4 text-gray-400" />
          <input data-testid="home-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classes, coaches, karate…" className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent" />
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-gray-900">Activities</h2>
          {active && <button data-testid="clear-category" onClick={() => setActive("")} className="text-xs font-medium text-[#6D28D9]">Clear</button>}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((c) => {
            const on = active === c.id;
            return (
              <button key={c.id} data-testid={`category-${c.id}`} onClick={() => setActive(on ? "" : c.id)} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${on ? "border-[#6D28D9] ring-2 ring-[#6D28D9]/30" : "border-transparent"}`} style={{ background: `${c.color}18` }}>
                  <c.icon className="h-6 w-6" style={{ color: c.color }} />
                </div>
                <span className="text-[10px] text-gray-600 font-medium text-center leading-tight">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular services */}
      <div className="mt-7">
        <div className="flex items-center justify-between mb-3 px-5">
          <h2 className="font-display text-lg font-bold text-gray-900">
            {active ? `Popular ${catMeta(active).label} classes` : "Popular classes"}
          </h2>
        </div>
        {svcFiltered.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">No classes found.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
            {svcFiltered.map((s, i) => (
              <motion.button
                key={s.id}
                data-testid={`service-card-${s.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/app/provider/${s.provider_id}`)}
                className="text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.98] transition-transform shrink-0 w-[240px]"
              >
                <div className="h-28 w-full overflow-hidden bg-gray-100">
                  <img src={s.image_url} alt={s.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${catMeta(s.category).color}18`, color: catMeta(s.category).color }}>
                    {catMeta(s.category).label}
                  </span>
                  <h3 className="font-display text-base font-bold text-gray-900 mt-1.5 truncate">{s.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.provider_name}</p>
                  <p className="text-sm text-gray-900 font-semibold mt-1.5">From {fmt(minPrice(s))}/mo</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Top providers */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-gray-900">
            {active ? `${catMeta(active).label} coaches` : "Top providers near you"}
          </h2>
        </div>
        <div className="space-y-4">
          {provFiltered.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">No providers found.</p>}
          {provFiltered.map((p, i) => (
            <motion.button
              key={p.user_id}
              data-testid={`provider-card-${p.user_id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/app/provider/${p.user_id}`)}
              className="w-full text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.98] transition-transform p-4 flex gap-4"
            >
              <img src={p.avatar_url} alt={p.business_name} className="h-20 w-20 rounded-2xl object-cover shrink-0 bg-gray-100" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-gray-900 truncate">{p.business_name}</h3>
                  <span className="flex items-center gap-0.5 text-xs text-gray-600 ml-auto shrink-0"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Award className="h-3 w-3" /> {p.experience_years}+ yrs experience</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(p.specialties || []).slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#6D28D9]/8 text-[#6D28D9]">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2.5">
                  <p className="text-sm text-gray-900 font-semibold">From {fmt(p.price_from)}/mo</p>
                  <span className="text-sm font-semibold text-[#6D28D9] flex items-center">View <ChevronRight className="h-4 w-4" /></span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
