import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";

export default function Classes() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = params.get("category") || "";
  const { catMeta } = useCategories();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/services", { params: category ? { category } : {} })
      .then((r) => setServices(r.data))
      .finally(() => setLoading(false));
  }, [category]);

  const minPrice = (s) => (s.items?.length ? Math.min(...s.items.map((i) => i.price)) : 0);

  return (
    <div className="pb-6">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="classes-back" onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
        <h1 className="font-display text-lg font-bold text-gray-900">{category ? `${catMeta(category).label} classes` : "All classes"}</h1>
      </div>

      <div className="px-5 mt-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : services.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No classes found.</p>
        ) : (
          <div className="space-y-4">
            {services.map((s, i) => (
              <motion.button
                key={s.id}
                data-testid={`class-card-${s.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/app/provider/${s.provider_id}`)}
                className="w-full text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm active:scale-[0.98] transition-transform flex gap-3 p-3"
              >
                <img src={s.image_url} alt={s.title} className="h-24 w-24 rounded-2xl object-cover shrink-0 bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${catMeta(s.category).color}18`, color: catMeta(s.category).color }}>
                    {catMeta(s.category).label}
                  </span>
                  <h3 className="font-display text-base font-bold text-gray-900 mt-1 truncate">{s.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.provider_name}</p>
                  {s.booking_count > 0 && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1"><Users className="h-3 w-3" /> {s.booking_count} subscriber{s.booking_count > 1 ? "s" : ""}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-sm text-gray-900 font-semibold">From {fmt(minPrice(s))}/mo</p>
                    <span className="text-sm font-semibold text-[#6D28D9] flex items-center">View <ChevronRight className="h-4 w-4" /></span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
