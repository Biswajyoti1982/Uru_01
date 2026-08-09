import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Users, Check, X, Phone, Mail } from "lucide-react";

const Badge = ({ status }) => {
  const map = { approved: "bg-emerald-50 text-emerald-600", pending: "bg-amber-50 text-amber-600", rejected: "bg-red-50 text-red-500" };
  return <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>;
};

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
    try { await api.post(`/admin/providers/${id}/${action}`); toast.success(action === "approve" ? "Approved" : "Rejected"); load(filter); }
    catch { toast.error("Action failed"); }
  };

  const filters = [["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]];

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Providers</h1>
        <p className="text-sm text-gray-500">Approve service providers</p>
      </div>
      <div className="p-8">
        <div className="flex gap-2 mb-6">
          {filters.map(([v, l]) => (
            <button key={v} data-testid={`provider-filter-${v || "all"}`} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === v ? "bg-[#6D28D9] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{l}</button>
          ))}
        </div>
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center"><Users className="h-10 w-10 text-gray-300 mb-3" /><p className="text-gray-500">No providers found.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <div key={p.user_id} data-testid={`provider-card-${p.user_id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-display text-lg font-bold text-gray-900">{p.business_name || p.name}</h3>
                  <Badge status={p.provider_status} />
                </div>
                <p className="text-sm text-gray-500 mt-1">{p.bio || "No bio provided."}</p>
                <div className="flex flex-col gap-1 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {p.email}</span>
                  {p.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {p.phone}</span>}
                  <span>{p.service_count} services</span>
                </div>
                {p.provider_status === "pending" && (
                  <div className="flex gap-2 mt-4">
                    <button data-testid={`approve-provider-${p.user_id}`} onClick={() => act(p.user_id, "approve")} className="flex-1 rounded-full bg-[#6D28D9] text-white font-semibold text-sm py-2 flex items-center justify-center gap-1 active:scale-95 transition-transform"><Check className="h-4 w-4" /> Approve</button>
                    <button data-testid={`reject-provider-${p.user_id}`} onClick={() => act(p.user_id, "reject")} className="flex-1 rounded-full border border-gray-200 text-gray-600 hover:text-red-500 font-semibold text-sm py-2 flex items-center justify-center gap-1 transition-colors"><X className="h-4 w-4" /> Reject</button>
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
