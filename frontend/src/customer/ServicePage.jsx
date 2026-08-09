import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, Plus, Minus, ShoppingBag } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt } from "@/lib/format";
import { useCart } from "@/context/CartContext";

export default function ServicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [svc, setSvc] = useState(null);
  const { cart, addItem, decItem } = useCart();
  const { catMeta } = useCategories();

  useEffect(() => {
    api.get(`/services/${id}`).then((r) => setSvc(r.data));
  }, [id]);

  if (!svc) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  const meta = catMeta(svc.category);
  const svcCtx = { id: svc.id, title: svc.title, image_url: svc.image_url, provider_name: svc.provider_name, category: svc.category };
  const qtyOf = (itemId) => (cart?.serviceId === svc.id ? cart.lines[itemId]?.qty || 0 : 0);

  return (
    <div className="pb-4">
      {/* Hero */}
      <div className="relative h-56">
        <img src={svc.image_url} alt={svc.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          data-testid="service-back"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white/90 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: meta.color, color: "#fff" }}>
            {meta.label}
          </span>
          <h1 className="font-display text-2xl font-bold mt-2">{svc.title}</h1>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 py-4 bg-white">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.8</span>
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {svc.location}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{svc.description}</p>
        <p className="text-xs text-gray-400 mt-2">by {svc.provider_name}</p>
      </div>

      {/* Custom package banner */}
      <div className="px-5 mt-3">
        <div className="bg-[#6D28D9]/8 border border-[#6D28D9]/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#6D28D9] flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Build your own package</p>
            <p className="text-xs text-gray-500">Add the sessions you want below</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 mt-5">
        <h2 className="font-display text-lg font-bold text-gray-900 mb-3">Choose services</h2>
        <div className="space-y-3">
          {svc.items?.length === 0 && <p className="text-sm text-gray-400">No sessions listed yet.</p>}
          {svc.items?.map((it) => {
            const qty = qtyOf(it.id);
            return (
              <div
                key={it.id}
                data-testid={`item-${it.id}`}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-gray-900">{it.name}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {it.duration_min} min
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{fmt(it.price)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                </div>
                {qty === 0 ? (
                  <button
                    data-testid={`add-item-${it.id}`}
                    onClick={() => addItem(svcCtx, it)}
                    className="px-5 py-2 rounded-full border-2 border-[#6D28D9] text-[#6D28D9] font-semibold text-sm flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-full bg-[#6D28D9] text-white px-2 py-1.5">
                    <button data-testid={`dec-item-${it.id}`} onClick={() => decItem(it.id)} className="active:scale-90 transition-transform"><Minus className="h-4 w-4" /></button>
                    <span data-testid={`qty-${it.id}`} className="text-sm font-semibold w-4 text-center">{qty}</span>
                    <button data-testid={`inc-item-${it.id}`} onClick={() => addItem(svcCtx, it)} className="active:scale-90 transition-transform"><Plus className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
