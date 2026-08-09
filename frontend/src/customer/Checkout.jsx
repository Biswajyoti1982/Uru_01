import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { fmt, fmtDate } from "@/lib/format";

const nextDays = (n) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, total, count, clearCart } = useCart();
  const [step, setStep] = useState(0); // 0 address, 1 slot, 2 summary
  const [address, setAddress] = useState("");
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState(nextDays(1)[0]);
  const [slot, setSlot] = useState("");
  const [placing, setPlacing] = useState(false);
  const placedRef = useRef(false);

  useEffect(() => {
    if (placedRef.current) return;
    if (!cart || count === 0) navigate("/app/cart", { replace: true });
  }, [cart, count, navigate]);
  useEffect(() => { api.get("/timeslots").then((r) => setSlots(r.data)); }, []);

  if (!cart) return null;

  const days = nextDays(7);

  const confirm = async () => {
    setPlacing(true);
    try {
      const items = Object.values(cart.lines).map((l) => ({ item_id: l.item.id, qty: l.qty }));
      await api.post("/bookings", { service_id: cart.serviceId, items, date, time_slot: slot, address });
      placedRef.current = true;
      clearCart();
      toast.success("Booking confirmed!");
      navigate("/app/bookings", { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not confirm booking");
    } finally {
      setPlacing(false);
    }
  };

  const titles = ["Your address", "Pick date & time", "Review & confirm"];

  return (
    <div className="pb-28 min-h-screen bg-gray-50">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="checkout-back" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} className="active:scale-90 transition-transform">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="font-display text-lg font-bold text-gray-900">{titles[step]}</h1>
        <div className="ml-auto flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[#6D28D9]" : "w-1.5 bg-gray-200"}`} />
          ))}
        </div>
      </div>

      {/* Step 0: address */}
      {step === 0 && (
        <div className="px-5 mt-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2"><MapPin className="h-3.5 w-3.5" /> Service address</label>
            <textarea
              data-testid="checkout-address-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={4}
              placeholder="Flat / House no, Street, Area, City"
              className="w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none border border-gray-200 rounded-xl p-3 focus:border-[#6D28D9]"
            />
          </div>
        </div>
      )}

      {/* Step 1: date & time */}
      {step === 1 && (
        <div className="px-5 mt-5">
          <p className="text-sm font-semibold text-gray-900 mb-2">Select date</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const on = d === date;
              const dt = new Date(d + "T00:00:00");
              return (
                <button
                  key={d}
                  data-testid={`date-${d}`}
                  onClick={() => setDate(d)}
                  className={`flex flex-col items-center min-w-[56px] py-2.5 rounded-2xl border ${on ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  <span className="text-[10px] uppercase">{dt.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="text-lg font-bold">{dt.getDate()}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm font-semibold text-gray-900 mt-5 mb-2">Available slots</p>
          <div className="grid grid-cols-3 gap-3">
            {slots.map((s) => {
              const on = s === slot;
              return (
                <button
                  key={s}
                  data-testid={`slot-${s}`}
                  onClick={() => setSlot(s)}
                  className={`py-3 rounded-xl border text-sm font-medium ${on ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-700 border-gray-200"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: summary */}
      {step === 2 && (
        <div className="px-5 mt-5 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <img src={cart.service.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div>
              <p className="font-semibold text-gray-900">{cart.service.title}</p>
              <p className="text-xs text-gray-500">{cart.service.provider_name}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            {Object.values(cart.lines).map((l) => (
              <div key={l.item.id} className="flex justify-between text-sm text-gray-700 py-1">
                <span>{l.item.name} × {l.qty}</span>
                <span>{fmt(l.item.price * l.qty)}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-200 my-2" />
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span><span data-testid="summary-total">{fmt(total)}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-gray-500">Date & time</span><span className="font-medium text-gray-900">{fmtDate(date)} · {slot}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">Address</span><span className="font-medium text-gray-900 text-right max-w-[60%]">{address}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Free booking — pay directly to the provider after your session.
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 z-40 max-w-md mx-auto">
        {step === 0 && (
          <button data-testid="address-continue" disabled={!address.trim()} onClick={() => setStep(1)} className="w-full h-12 rounded-full bg-[#6D28D9] text-white font-semibold disabled:opacity-40 active:scale-95 transition-transform">Continue</button>
        )}
        {step === 1 && (
          <button data-testid="slot-continue" disabled={!slot} onClick={() => setStep(2)} className="w-full h-12 rounded-full bg-[#6D28D9] text-white font-semibold disabled:opacity-40 active:scale-95 transition-transform">Continue</button>
        )}
        {step === 2 && (
          <button data-testid="confirm-booking-button" disabled={placing} onClick={confirm} className="w-full h-12 rounded-full bg-[#6D28D9] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform">
            {placing ? "Confirming…" : `Confirm booking · ${fmt(total)}`}
          </button>
        )}
      </div>
    </div>
  );
}
