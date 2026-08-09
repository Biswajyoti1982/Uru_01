import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { PageHeader, EmptyState } from "@/components/Shared";
import { Compass, MapPin, Signal } from "lucide-react";

export default function Browse() {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async (cat) => {
    setLoading(true);
    try {
      const res = await api.get("/services", { params: cat ? { category: cat } : {} });
      setServices(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(category); }, [category]);

  return (
    <div>
      <PageHeader title="Browse Activities" subtitle="Find your next session" />
      <div className="p-8">
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            data-testid="filter-all"
            onClick={() => setCategory("")}
            className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors ${category === "" ? "bg-[#39FF14] text-black border-[#39FF14]" : "border-white/20 text-white/60 hover:bg-white/10"}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              data-testid={`filter-${c.id}`}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors ${category === c.id ? "bg-[#39FF14] text-black border-[#39FF14]" : "border-white/20 text-white/60 hover:bg-white/10"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : services.length === 0 ? (
          <EmptyState icon={Compass} title="No activities yet" desc="Check back soon — new classes are added by verified providers." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((svc) => (
              <div
                key={svc.id}
                data-testid={`activity-card-${svc.id}`}
                onClick={() => navigate(`/app/activity/${svc.id}`)}
                className="group border border-white/10 bg-[#141414] hover:border-white/30 transition-colors cursor-pointer overflow-hidden"
              >
                <div className="h-44 overflow-hidden bg-black relative">
                  {svc.image_url ? (
                    <img src={svc.image_url} alt={svc.title} className="h-full w-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className="h-full w-full bg-white/5" />
                  )}
                  <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 bg-black/70 text-[#39FF14] border border-[#39FF14]/40">
                    {categoryLabel(svc.category)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-2xl uppercase tracking-tight font-bold leading-tight">{svc.title}</h3>
                  <p className="text-white/50 text-sm mt-2 line-clamp-2">{svc.description}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-white/40 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Signal className="h-3.5 w-3.5" /> {svc.level}</span>
                    {svc.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {svc.location}</span>}
                  </div>
                  <p className="text-xs text-white/30 mt-3">by {svc.provider_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
