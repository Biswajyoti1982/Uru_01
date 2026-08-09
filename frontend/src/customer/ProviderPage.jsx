import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Award, Languages, BadgeCheck, Plus, Minus, Clock, Video, MapPin, Building2 } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";
import { useCart } from "@/context/CartContext";

const SlotPreview = ({ slots = [] }) => {
  const virtual = [...new Set(slots.filter((s) => s.mode === "virtual").map((s) => s.time))].sort();
  const physical = slots.filter((s) => s.mode === "physical");
  if (!slots.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {virtual.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg shrink-0"><Video className="h-3.5 w-3.5" /> Virtual</span>
          <div className="flex flex-wrap gap-1.5">
            {virtual.map((t) => <span key={t} className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">{t}</span>)}
          </div>
        </div>
      )}
      {physical.map((s, idx) => (
        <div key={`${s.time}-${idx}`} className="flex items-start gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#6D28D9] bg-[#6D28D9]/8 px-2 py-1 rounded-lg shrink-0"><MapPin className="h-3.5 w-3.5" /> {s.time}</span>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 pt-1"><Building2 className="h-3 w-3" /> {(s.society_names || []).join(", ") || "—"}</p>
        </div>
      ))}
    </div>
  );
};

export default function ProviderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prov, setProv] = useState(null);
  const { cart, addItem, decItem } = useCart();
  const { catMeta } = useCategories();

  useEffect(() => {
    api.get(`/providers/${id}`).then((r) => setProv(r.data)).catch(() => setProv(false));
  }, [id]);

  if (prov === false) return <div className="p-6 text-sm text-gray-400">Provider not found.</div>;
  if (!prov) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  const qtyOf = (svcId, itemId) => (cart?.serviceId === svcId ? cart.lines[itemId]?.qty || 0 : 0);
  const svcCtx = (s) => ({ id: s.id, title: s.title, image_url: s.image_url, provider_name: prov.business_name, category: s.category });

  return (
    <div data-testid="provider-page" className="pb-6">
      {/* Header */}
      <div className="bg-[#6D28D9] text-white px-5 pt-4 pb-6 rounded-b-3xl">
        <button data-testid="provider-back" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform mb-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-4">
          <img src={prov.avatar_url} alt={prov.business_name} className="h-20 w-20 rounded-2xl object-cover bg-white/20 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold leading-tight">{prov.business_name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-white/90">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-300 text-amber-300" /> {prov.rating}</span>
              <span className="flex items-center gap-1"><Award className="h-4 w-4" /> {prov.experience_years}+ yrs</span>
            </div>
            <p className="text-sm text-white/90 mt-1">From <b>{fmt(prov.price_from)}</b>/mo</p>
          </div>
        </div>
      </div>

      {/* About */}
      {prov.bio && (
        <div className="px-5 mt-5">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-2">About</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{prov.bio}</p>
        </div>
      )}

      {/* Languages */}
      {(prov.languages || []).length > 0 && (
        <div className="px-5 mt-4 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500"><Languages className="h-4 w-4" /> Speaks:</span>
          {prov.languages.map((l) => <span key={l} className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{l}</span>)}
        </div>
      )}

      {/* Certifications */}
      {(prov.certifications || []).length > 0 && (
        <div className="px-5 mt-5">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-2">Certifications & qualifications</h2>
          <div className="space-y-2">
            {prov.certifications.map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm text-gray-700"><BadgeCheck className="h-4 w-4 text-emerald-500 shrink-0" /> {c}</div>
            ))}
          </div>
        </div>
      )}

      {/* Classes */}
      <div className="px-5 mt-6">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-3">Classes & pricing</h2>
        {prov.services.length === 0 && <p className="text-sm text-gray-400">No classes published yet.</p>}
        <div className="space-y-5">
          {prov.services.map((s) => {
            const meta = catMeta(s.category);
            return (
              <div key={s.id} data-testid={`provider-service-${s.id}`} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {s.image_url && <img src={s.image_url} alt={s.title} className="h-32 w-full object-cover" />}
                <div className="p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
                  <h3 className="font-display text-lg font-bold text-gray-900 mt-1.5">{s.title}</h3>
                  {s.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.description}</p>}

                  <SlotPreview slots={s.slots} />

                  <div className="mt-4 space-y-2">
                    {(s.items || []).map((it) => {
                      const qty = qtyOf(s.id, it.id);
                      return (
                        <div key={it.id} data-testid={`item-${it.id}`} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{it.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {it.duration_min} min · {fmt(it.price)}<span className="text-gray-400">/mo</span></p>
                          </div>
                          {qty === 0 ? (
                            <button data-testid={`add-item-${it.id}`} onClick={() => addItem(svcCtx(s), it)} className="px-4 py-2 rounded-full border-2 border-[#6D28D9] text-[#6D28D9] font-semibold text-sm flex items-center gap-1 active:scale-95 transition-transform">
                              <Plus className="h-4 w-4" /> Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 rounded-full bg-[#6D28D9] text-white px-2 py-1.5">
                              <button data-testid={`dec-item-${it.id}`} onClick={() => decItem(it.id)} className="active:scale-90 transition-transform"><Minus className="h-4 w-4" /></button>
                              <span data-testid={`qty-${it.id}`} className="text-sm font-semibold w-4 text-center">{qty}</span>
                              <button data-testid={`inc-item-${it.id}`} onClick={() => addItem(svcCtx(s), it)} className="active:scale-90 transition-transform"><Plus className="h-4 w-4" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
