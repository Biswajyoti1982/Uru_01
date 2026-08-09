import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { categoryLabel } from "@/lib/categories";
import { PageHeader, EmptyState, StatusBadge } from "@/components/Shared";
import { ShieldCheck, Check, X, Eye, EyeOff } from "lucide-react";

export default function AdminServices() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (f) => {
    setLoading(true);
    try { setItems((await api.get("/admin/services", { params: f ? { status: f } : {} })).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(filter); }, [filter]);

  const act = async (id, action, msg) => {
    try { await api.post(`/admin/services/${id}/${action}`); toast.success(msg); load(filter); }
    catch { toast.error("Action failed"); }
  };

  const filters = [["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];

  return (
    <div>
      <PageHeader title="Services" subtitle="Control what customers see" />
      <div className="p-8">
        <div className="flex gap-2 mb-6">
          {filters.map(([v, l]) => (
            <button key={v} data-testid={`service-filter-${v || "all"}`} onClick={() => setFilter(v)} className={`px-4 py-2 text-xs uppercase tracking-widest font-bold border transition-colors ${filter === v ? "bg-[#39FF14] text-black border-[#39FF14]" : "border-white/20 text-white/60 hover:bg-white/10"}`}>{l}</button>
          ))}
        </div>
        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No services" desc="Provider services will appear here for review." />
        ) : (
          <div className="border border-white/10">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40 bg-[#0d0d0d]">
              <div className="col-span-4">Service</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {items.map((s) => (
              <div key={s.id} data-testid={`admin-service-row-${s.id}`} className="grid grid-cols-12 px-5 py-4 border-b border-white/10 text-sm items-center hover:bg-white/5 transition-colors">
                <div className="col-span-4">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-white/40 text-xs">{s.class_count} classes {s.is_visible ? "" : "· hidden"}</p>
                </div>
                <div className="col-span-2 text-white/60 text-xs uppercase tracking-wider">{categoryLabel(s.category)}</div>
                <div className="col-span-2 text-white/60 text-xs">{s.provider_name}</div>
                <div className="col-span-1"><StatusBadge status={s.status} /></div>
                <div className="col-span-3 flex justify-end gap-2">
                  {s.status !== "approved" && (
                    <button data-testid={`approve-service-${s.id}`} onClick={() => act(s.id, "approve", "Service approved")} className="border border-[#39FF14]/40 text-[#39FF14] hover:bg-[#39FF14]/10 px-3 py-1.5 text-xs uppercase tracking-widest font-bold flex items-center gap-1 transition-colors"><Check className="h-3.5 w-3.5" /> Approve</button>
                  )}
                  {s.status !== "rejected" && (
                    <button data-testid={`reject-service-${s.id}`} onClick={() => act(s.id, "reject", "Service rejected")} className="border border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/40 px-3 py-1.5 text-xs uppercase tracking-widest font-bold flex items-center gap-1 transition-colors"><X className="h-3.5 w-3.5" /> Reject</button>
                  )}
                  <button data-testid={`toggle-visibility-${s.id}`} onClick={() => act(s.id, "toggle-visibility", "Visibility updated")} className="border border-white/20 text-white/60 hover:bg-white/10 px-3 py-1.5 transition-colors" title="Toggle visibility">
                    {s.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
