import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/Shared";
import { Users, Check, X, Phone, Mail } from "lucide-react";

export default function AdminProviders() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (f) => {
    setLoading(true);
    try { setItems((await api.get("/admin/providers", { params: f ? { status: f } : {} })).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(filter); }, [filter]);

  const act = async (id, action) => {
    try {
      await api.post(`/admin/providers/${id}/${action}`);
      toast.success(action === "approve" ? "Provider approved" : "Provider rejected");
      load(filter);
    } catch { toast.error("Action failed"); }
  };

  const filters = [["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];

  return (
    <div>
      <PageHeader title="Providers" subtitle="Approve service providers" />
      <div className="p-8">
        <div className="flex gap-2 mb-6">
          {filters.map(([v, l]) => (
            <button key={v} data-testid={`provider-filter-${v || "all"}`} onClick={() => setFilter(v)} className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors ${filter === v ? "bg-[#39FF14] text-black border-[#39FF14]" : "border-white/20 text-white/60 hover:bg-white/10"}`}>{l}</button>
          ))}
        </div>
        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Users} title="No providers" desc="Provider applications will appear here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <div key={p.user_id} data-testid={`provider-card-${p.user_id}`} className="border border-white/10 bg-[#141414] p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-2xl uppercase tracking-tight font-bold">{p.business_name || p.name}</h3>
                  <StatusBadge status={p.provider_status} />
                </div>
                <p className="text-white/50 text-sm mt-2">{p.bio || "No bio provided."}</p>
                <div className="flex flex-col gap-1 mt-3 text-xs text-white/40">
                  <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {p.email}</span>
                  {p.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {p.phone}</span>}
                  <span>{p.service_count} services</span>
                </div>
                {p.provider_status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <button data-testid={`approve-provider-${p.user_id}`} onClick={() => act(p.user_id, "approve")} className="flex-1 bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs py-2 hover:bg-[#32E612] transition-colors flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5" /> Approve</button>
                    <button data-testid={`reject-provider-${p.user_id}`} onClick={() => act(p.user_id, "reject")} className="flex-1 border border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/40 font-bold uppercase tracking-widest text-xs py-2 transition-colors flex items-center justify-center gap-1"><X className="h-3.5 w-3.5" /> Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
