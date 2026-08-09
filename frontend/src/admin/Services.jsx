import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useCategories } from "@/context/CategoriesContext";
import { ShieldCheck, Check, X, Eye, EyeOff } from "lucide-react";

const Badge = ({ status }) => {
  const map = { approved: "bg-emerald-50 text-emerald-600", pending: "bg-amber-50 text-amber-600", rejected: "bg-red-50 text-red-500" };
  return <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>;
};

export default function AdminServices() {
  const { catMeta } = useCategories();
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
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Services</h1>
        <p className="text-sm text-gray-500">Control what customers see</p>
      </div>
      <div className="p-8">
        <div className="flex gap-2 mb-6">
          {filters.map(([v, l]) => (
            <button key={v} data-testid={`service-filter-${v || "all"}`} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === v ? "bg-[#6D28D9] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{l}</button>
          ))}
        </div>
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center"><ShieldCheck className="h-10 w-10 text-gray-300 mb-3" /><p className="text-gray-500">No services found.</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400 font-semibold bg-gray-50">
              <div className="col-span-4">Service</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Provider</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {items.map((s) => (
              <div key={s.id} data-testid={`admin-service-row-${s.id}`} className="grid grid-cols-12 px-5 py-4 border-b border-gray-100 text-sm items-center">
                <div className="col-span-4">
                  <p className="font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.item_count} items {s.is_visible ? "" : "· hidden"}</p>
                </div>
                <div className="col-span-2 text-xs" style={{ color: catMeta(s.category).color }}>{catMeta(s.category).label}</div>
                <div className="col-span-2 text-gray-600 text-xs">{s.provider_name}</div>
                <div className="col-span-1"><Badge status={s.status} /></div>
                <div className="col-span-3 flex justify-end gap-2">
                  {s.status !== "approved" && <button data-testid={`approve-service-${s.id}`} onClick={() => act(s.id, "approve", "Approved")} className="rounded-full bg-[#6D28D9]/10 text-[#6D28D9] px-3 py-1.5 text-xs font-semibold flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Approve</button>}
                  {s.status !== "rejected" && <button data-testid={`reject-service-${s.id}`} onClick={() => act(s.id, "reject", "Rejected")} className="rounded-full border border-gray-200 text-gray-500 hover:text-red-500 px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors"><X className="h-3.5 w-3.5" /> Reject</button>}
                  <button data-testid={`toggle-visibility-${s.id}`} onClick={() => act(s.id, "toggle-visibility", "Visibility updated")} className="rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 px-3 py-1.5 transition-colors">{s.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
