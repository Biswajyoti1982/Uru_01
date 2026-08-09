import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CalendarCheck, MapPin, Clock, X } from "lucide-react";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { fmt, fmtDate } from "@/lib/format";

export default function Bookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { catMeta } = useCategories();

  const load = async () => {
    setLoading(true);
    try { setItems((await api.get("/bookings/me")).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    try { await api.delete(`/bookings/${id}`); toast.success("Booking cancelled"); load(); }
    catch { toast.error("Could not cancel"); }
  };

  return (
    <div>
      <div className="bg-white px-5 py-5 border-b border-gray-100">
        <h1 className="font-display text-2xl font-bold text-gray-900">My bookings</h1>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <CalendarCheck className="h-7 w-7 text-gray-300" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900">No bookings yet</h2>
            <p className="text-sm text-gray-500 mt-1">Book a service to see it here.</p>
            <button data-testid="bookings-browse-button" onClick={() => navigate("/app")} className="mt-6 px-6 py-3 rounded-full bg-[#6D28D9] text-white font-semibold text-sm active:scale-95 transition-transform">Browse services</button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((b) => {
              const meta = catMeta(b.category);
              const cancelled = b.status === "cancelled";
              return (
                <div key={b.id} data-testid={`booking-${b.id}`} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${cancelled ? "opacity-60" : ""}`}>
                  <div className="flex gap-3 p-4">
                    <img src={b.service_image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cancelled ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>{b.status}</span>
                      </div>
                      <p className="font-semibold text-gray-900 mt-1 truncate">{b.service_title}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {fmtDate(b.date)} · {b.time_slot}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-3 -mt-1">
                    {b.items.map((li) => (
                      <div key={li.item_id} className="flex justify-between text-xs text-gray-600 py-0.5">
                        <span>{li.name} × {li.qty}</span><span>{fmt(li.price * li.qty)}</span>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-2"><MapPin className="h-3 w-3" /> {b.address}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-900">{fmt(b.total)}</span>
                      {!cancelled && (
                        <button data-testid={`cancel-booking-${b.id}`} onClick={() => cancel(b.id)} className="text-xs font-medium text-red-500 flex items-center gap-1 active:scale-95 transition-transform">
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
