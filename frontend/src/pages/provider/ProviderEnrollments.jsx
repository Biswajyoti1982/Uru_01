import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/Shared";
import { ClipboardList, Mail } from "lucide-react";

const fmtDate = (d) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return d; }
};

export default function ProviderEnrollments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setItems((await api.get("/provider/enrollments")).data); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Attendees" subtitle="Who's enrolled in your classes" />
      <div className="p-8">
        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No attendees yet" desc="Once customers enroll in your classes, they'll appear here." />
        ) : (
          <div className="border border-white/10">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40 bg-[#0d0d0d]">
              <div className="col-span-3">Attendee</div>
              <div className="col-span-3">Service</div>
              <div className="col-span-3">Class</div>
              <div className="col-span-3">Date</div>
            </div>
            {items.map((e) => (
              <div key={e.id} data-testid={`attendee-row-${e.id}`} className="grid grid-cols-12 px-5 py-4 border-b border-white/10 text-sm hover:bg-white/5 transition-colors items-center">
                <div className="col-span-3">
                  <p className="font-medium">{e.customer_name}</p>
                  <p className="text-white/40 text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> {e.customer_email}</p>
                </div>
                <div className="col-span-3 text-white/60">{e.service_title}</div>
                <div className="col-span-3 text-white/60">{e.class_title}</div>
                <div className="col-span-3 text-white/60 uppercase tracking-wider text-xs">{fmtDate(e.class_date)} · {e.class_start}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
