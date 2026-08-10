import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Award, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";

export default function ProvidersList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const category = params.get("category") || "";
  const { catMeta } = useCategories();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/providers", { params: category ? { category } : {} })
      .then((r) => setProviders(r.data))
      .finally(() => setLoading(false));
  }, [category]);

  const label = category ? catMeta(category).label : "All";

  return (
    <div className="pb-6">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="providers-back" onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
        <div>
          <h1 className="font-display text-lg font-bold text-gray-900">{label} coaches</h1>
          <p className="text-xs text-gray-500">{loading ? "Loading…" : `${providers.length} provider${providers.length !== 1 ? "s" : ""} available`}</p>
        </div>
      </div>

      <div className="px-5 mt-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No providers offer this activity yet.</p>
        ) : (
          <div className="space-y-4">
            {providers.map((p, i) => (
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
        )}
      </div>
    </div>
  );
}
