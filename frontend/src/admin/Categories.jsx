import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveIcon, ICON_OPTIONS } from "@/lib/catmeta";
import { useCategories } from "@/context/CategoriesContext";
import { Plus } from "lucide-react";

const COLORS = ["#6D28D9", "#EC4899", "#F97316", "#EF4444", "#06B6D4", "#10B981", "#3B82F6", "#8B5CF6", "#0EA5E9", "#6366F1"];

export default function AdminCategories() {
  const { reloadCategories } = useCategories();
  const [cats, setCats] = useState([]);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("sparkles");
  const [color, setColor] = useState("#6D28D9");
  const [busy, setBusy] = useState(false);

  const load = async () => setCats((await api.get("/categories")).data);
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!label.trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      await api.post("/admin/categories", { label, icon, color });
      toast.success("Activity added");
      setLabel(""); setIcon("sparkles"); setColor("#6D28D9");
      await load();
      if (reloadCategories) reloadCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-sm text-gray-500">Manage the categories customers can browse</p>
      </div>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Existing */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">All activities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cats.map((c) => {
              const Icon = resolveIcon(c.icon);
              return (
                <div key={c.id} data-testid={`category-item-${c.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `${c.color}18` }}>
                    <Icon className="h-5 w-5" style={{ color: c.color }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create */}
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">New activity</h2>
          <form onSubmit={create} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Name</label>
              <input data-testid="category-name-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Swimming" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#6D28D9] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((name) => {
                  const Icon = resolveIcon(name);
                  const on = icon === name;
                  return (
                    <button type="button" key={name} data-testid={`icon-${name}`} onClick={() => setIcon(name)} className={`h-10 rounded-xl flex items-center justify-center border ${on ? "border-[#6D28D9] bg-[#6D28D9]/10" : "border-gray-200"}`}>
                      <Icon className="h-4 w-4" style={{ color: on ? "#6D28D9" : "#6B7280" }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} data-testid={`color-${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-gray-900" : ""}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <button data-testid="create-category-button" disabled={busy} className="w-full h-11 rounded-full bg-[#6D28D9] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add activity"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
