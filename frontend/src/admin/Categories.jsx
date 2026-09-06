import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { resolveIcon, ICON_OPTIONS } from "@/lib/catmeta";
import { useCategories } from "@/context/CategoriesContext";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const COLORS = ["#6D28D9", "#EC4899", "#F97316", "#EF4444", "#06B6D4", "#10B981", "#3B82F6", "#8B5CF6", "#0EA5E9", "#6366F1"];

export default function AdminCategories() {
  const { reloadCategories } = useCategories();
  const [cats, setCats] = useState([]);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("sparkles");
  const [color, setColor] = useState("#F97316");
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => setCats((await api.get("/categories")).data);
  useEffect(() => { load(); }, []);

  const resetForm = () => { setEditId(null); setLabel(""); setIcon("sparkles"); setColor("#F97316"); };

  const startEdit = (c) => { setEditId(c.id); setLabel(c.label); setIcon(c.icon); setColor(c.color); };

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      if (editId) {
        await api.put(`/admin/categories/${editId}`, { label, icon, color });
        toast.success("Activity updated");
      } else {
        await api.post("/admin/categories", { label, icon, color });
        toast.success("Activity added");
      }
      resetForm();
      await load();
      if (reloadCategories) reloadCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.label}"?`)) return;
    try {
      await api.delete(`/admin/categories/${c.id}`);
      toast.success("Activity deleted");
      if (editId === c.id) resetForm();
      await load();
      if (reloadCategories) reloadCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div>
      <div className="bg-[#0F1420] border-b border-white/10 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-white">Activities</h1>
        <p className="text-sm text-gray-400">Create, edit and remove the categories customers can browse</p>
      </div>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Existing */}
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-white mb-4">All activities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cats.map((c) => {
              const Icon = resolveIcon(c.icon);
              return (
                <div key={c.id} data-testid={`category-item-${c.id}`} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}22` }}>
                    <Icon className="h-5 w-5" style={{ color: c.color }} />
                  </div>
                  <span className="text-sm font-semibold text-white flex-1 truncate">{c.label}</span>
                  <button data-testid={`edit-category-${c.id}`} onClick={() => startEdit(c)} className="h-8 w-8 rounded-lg border border-white/10 text-gray-400 hover:text-[#F97316] hover:border-[#F97316] flex items-center justify-center transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button data-testid={`delete-category-${c.id}`} onClick={() => remove(c)} className="h-8 w-8 rounded-lg border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/50 flex items-center justify-center transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create / Edit */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-white">{editId ? "Edit activity" : "New activity"}</h2>
            {editId && <button data-testid="cancel-edit-category" onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancel</button>}
          </div>
          <form onSubmit={submit} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Name</label>
              <input data-testid="category-name-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Swimming" className="w-full text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2.5 focus:border-[#F97316] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((name) => {
                  const Icon = resolveIcon(name);
                  const on = icon === name;
                  return (
                    <button type="button" key={name} data-testid={`icon-${name}`} onClick={() => setIcon(name)} className={`h-10 rounded-xl flex items-center justify-center border transition-colors ${on ? "border-[#F97316] bg-[#F97316]/10" : "border-white/10 hover:bg-white/5"}`}>
                      <Icon className="h-4 w-4" style={{ color: on ? "#F97316" : "#9CA3AF" }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button type="button" key={c} data-testid={`color-${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-[#151A24] ring-white" : ""}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <button data-testid={editId ? "update-category-button" : "create-category-button"} disabled={busy} className="w-full h-11 rounded-full bg-[#F97316] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
              {editId ? <><Pencil className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}</> : <><Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add activity"}</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
