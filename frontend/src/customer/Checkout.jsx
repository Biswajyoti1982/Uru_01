import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CheckCircle2, CalendarClock } from "lucide-react";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { fmt, fmtDate } from "@/lib/format";
import { PRESET_SLOTS } from "@/lib/slots";
import { PLANS, planTotal } from "@/lib/plans";

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, total, count, clearCart } = useCart(); // total = per-month price
  const [step, setStep] = useState(0); // 0 plan, 1 address, 2 schedule, 3 summary
  const [planId, setPlanId] = useState("monthly");
  const [address, setAddress] = useState("");
  const [svcData, setSvcData] = useState(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [placing, setPlacing] = useState(false);
  const placedRef = useRef(false);

  useEffect(() => {
    if (placedRef.current) return;
    if (!cart || count === 0) navigate("/app/cart", { replace: true });
  }, [cart, count, navigate]);
  useEffect(() => {
    if (cart?.serviceId) api.get(`/services/${cart.serviceId}`).then((r) => setSvcData(r.data));
  }, [cart?.serviceId]);

  const availDays = svcData?.available_days?.length ? svcData.available_days : [0, 1, 2, 3, 4, 5, 6];
  const slots = svcData?.slots?.length ? svcData.slots : PRESET_SLOTS;

  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 28 && out.length < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (availDays.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availDays.join(",")]);

  useEffect(() => {
    if (days.length && !days.includes(date)) setDate(days[0]);
  }, [days, date]);

  if (!cart) return null;

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const planPrice = planTotal(total, plan);
  const savings = total * plan.months - planPrice;

  const confirm = async () => {
    setPlacing(true);
    try {
      const items = Object.values(cart.lines).map((l) => ({ item_id: l.item.id, qty: l.qty }));
      await api.post("/bookings", { service_id: cart.serviceId, items, date, time_slot: slot, address, plan: planId });
      placedRef.current = true;
      clearCart();
      toast.success("Subscription activated!");
      navigate("/app/bookings", { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not activate subscription");
    } finally {
      setPlacing(false);
    }
  };

  const titles = ["Choose a plan", "Your address", "Weekly schedule", "Review & confirm"];
  const btn = "w-full h-12 rounded-full bg-[#6D28D9] text-white font-semibold disabled:opacity-40 active:scale-95 transition-transform";

  return (
    <div className="pb-28 min-h-screen bg-gray-50">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="checkout-back" onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))} className="active:scale-90 transition-transform">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="font-display text-lg font-bold text-gray-900">{titles[step]}</h1>
        <div className="ml-auto flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-[#6D28D9]" : "w-1.5 bg-gray-200"}`} />
          ))}
        </div>
      </div>

      {/* Step 0: plan */}
      {step === 0 && (
        <div className="px-5 mt-5 space-y-3">
          <p className="text-sm text-gray-500">Billed at <b className="text-gray-800">{fmt(total)}/month</b>. Commit longer and save.</p>
          {PLANS.map((p) => {
            const price = planTotal(total, p);
            const on = planId === p.id;
            return (
              <button
                key={p.id}
                data-testid={`plan-${p.id}`}
                onClick={() => setPlanId(p.id)}
                className={`w-full text-left rounded-2xl border p-4 flex items-center justify-between transition-colors ${on ? "border-[#6D28D9] bg-[#6D28D9]/5 ring-1 ring-[#6D28D9]" : "border-gray-200 bg-white"}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{p.label}</p>
                    {p.discount > 0 && <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Save {Math.round(p.discount * 100)}%</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.months} month{p.months > 1 ? "s" : ""} · {fmt(Math.round(price / p.months))}/mo effective</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-900">{fmt(price)}</p>
                  <div className={`h-4 w-4 rounded-full border-2 ${on ? "border-[#6D28D9] bg-[#6D28D9]" : "border-gray-300"}`} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 1: address */}
      {step === 1 && (
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

      {/* Step 2: schedule */}
      {step === 2 && (
        <div className="px-5 mt-5">
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Choose your start date & weekly time slot</p>
          <p className="text-sm font-semibold text-gray-900 mb-2">Start date</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const on = d === date;
              const dt = new Date(d + "T00:00:00");
              return (
                <button key={d} data-testid={`date-${d}`} onClick={() => setDate(d)} className={`flex flex-col items-center min-w-[56px] py-2.5 rounded-2xl border ${on ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-700 border-gray-200"}`}>
                  <span className="text-[10px] uppercase">{dt.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="text-lg font-bold">{dt.getDate()}</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-5 mb-2">Weekly time slot</p>
          <div className="grid grid-cols-3 gap-3">
            {slots.map((s) => {
              const on = s === slot;
              return (
                <button key={s} data-testid={`slot-${s}`} onClick={() => setSlot(s)} className={`py-3 rounded-xl border text-sm font-medium ${on ? "bg-[#6D28D9] text-white border-[#6D28D9]" : "bg-white text-gray-700 border-gray-200"}`}>{s}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: summary */}
      {step === 3 && (
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
                <span>{fmt(l.item.price * l.qty)}/mo</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-200 my-2" />
            <div className="flex justify-between text-sm text-gray-700 py-1"><span>Per month</span><span>{fmt(total)}</span></div>
            <div className="flex justify-between text-sm text-gray-700 py-1"><span>{plan.label} × {plan.months} mo</span><span>{fmt(total * plan.months)}</span></div>
            {savings > 0 && <div className="flex justify-between text-sm text-emerald-600 py-1"><span>Plan discount</span><span>-{fmt(savings)}</span></div>}
            <div className="border-t border-dashed border-gray-200 my-2" />
            <div className="flex justify-between text-base font-bold text-gray-900"><span>Total ({plan.label})</span><span data-testid="summary-total">{fmt(planPrice)}</span></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-gray-500">Plan</span><span className="font-medium text-gray-900">{plan.label}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">Starts</span><span className="font-medium text-gray-900">{fmtDate(date)} · {slot}</span></div>
            <div className="flex justify-between py-1"><span className="text-gray-500">Address</span><span className="font-medium text-gray-900 text-right max-w-[60%]">{address}</span></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Free to activate — pay the provider directly for your subscription.
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 z-40 max-w-md mx-auto">
        {step === 0 && <button data-testid="plan-continue" onClick={() => setStep(1)} className={btn}>Continue · {fmt(planPrice)}</button>}
        {step === 1 && <button data-testid="address-continue" disabled={!address.trim()} onClick={() => setStep(2)} className={btn}>Continue</button>}
        {step === 2 && <button data-testid="slot-continue" disabled={!slot} onClick={() => setStep(3)} className={btn}>Continue</button>}
        {step === 3 && (
          <button data-testid="confirm-booking-button" disabled={placing} onClick={confirm} className={btn + " flex items-center justify-center gap-2"}>
            {placing ? "Activating…" : `Confirm subscription · ${fmt(planPrice)}`}
          </button>
        )}
      </div>
    </div>
  );
}
