import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmt, fmtDate } from "@/lib/format";
import { ClipboardList, Mail } from "lucide-react";

export default function ProviderBookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => { try { setItems((await api.get("/provider/bookings")).data); } finally { setLoading(false); } })();
  }, []);

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Subscribers</h1>
        <p className="text-sm text-gray-500">Customers subscribed to your services</p>
      </div>
      <div className="p-8">
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
            <h3 className="font-display text-xl font-bold text-gray-900">No subscribers yet</h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400 font-semibold bg-gray-50">
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Service</div>
              <div className="col-span-3">Plan & slot</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-1">Status</div>
            </div>
            {items.map((b) => (
              <div key={b.id} data-testid={`provider-booking-${b.id}`} className="grid grid-cols-12 px-5 py-4 border-b border-gray-100 text-sm items-center">
                <div className="col-span-3">
                  <p className="font-medium text-gray-900">{b.customer_name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" /> {b.customer_email}</p>
                </div>
                <div className="col-span-3 text-gray-600">{b.service_title}<p className="text-xs text-gray-400">{b.items.map((i) => `${i.name}×${i.qty}`).join(", ")}</p></div>
                <div className="col-span-3 text-gray-600">{b.plan_label || "Monthly"}<p className="text-xs text-gray-400">weekly {b.time_slot} · from {fmtDate(b.start_date || b.date)}</p></div>
                <div className="col-span-2 font-semibold text-gray-900">{fmt(b.total)}</div>
                <div className="col-span-1"><span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${b.status === "cancelled" ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>{b.status}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
