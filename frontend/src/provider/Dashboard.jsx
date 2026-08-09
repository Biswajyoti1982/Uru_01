import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CATEGORIES, catMeta } from "@/lib/catmeta";
import { fmt } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Store, Plus, Trash2, Layers, X } from "lucide-react";

const emptyService = { title: "", description: "", category: "salon", image_url: "", location: "" };
const emptyItem = { name: "", price: "", duration_min: 60 };

const Badge = ({ status }) => {
  const map = { approved: "bg-emerald-50 text-emerald-600", pending: "bg-amber-50 text-amber-600", rejected: "bg-red-50 text-red-500" };
  return <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>;
};

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcForm, setSvcForm] = useState(emptyService);
  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setServices((await api.get("/provider/services")).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setSvcForm(emptyService); setItems([]); setItemForm(emptyItem); setEditId(null); setSvcOpen(true); };
  const openEdit = (s) => {
    setSvcForm({ title: s.title, description: s.description, category: s.category, image_url: s.image_url, location: s.location });
    setItems(s.items || []); setItemForm(emptyItem); setEditId(s.id); setSvcOpen(true);
  };

  const addLocalItem = () => {
    if (!itemForm.name.trim() || !itemForm.price) return toast.error("Item name & price required");
    setItems([...items, { id: `tmp_${Date.now()}`, name: itemForm.name, price: Number(itemForm.price), duration_min: Number(itemForm.duration_min) || 60 }]);
    setItemForm(emptyItem);
  };
  const removeLocalItem = (id) => setItems(items.filter((i) => i.id !== id));

  const save = async (e) => {
    e.preventDefault();
    if (!svcForm.title.trim()) return toast.error("Title required");
    if (items.length === 0) return toast.error("Add at least one service item");
    const payload = { ...svcForm, items: items.map((i) => ({ name: i.name, price: Number(i.price), duration_min: Number(i.duration_min) })) };
    try {
      if (editId) await api.put(`/provider/services/${editId}`, payload);
      else await api.post("/provider/services", payload);
      toast.success(editId ? "Service updated — pending review" : "Service created — pending approval");
      setSvcOpen(false); load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    await api.delete(`/provider/services/${id}`); toast.success("Deleted"); load();
  };

  const inputCls = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#6D28D9] outline-none";

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">My services</h1>
          <p className="text-sm text-gray-500">Publish and manage your offerings</p>
        </div>
        <button data-testid="new-service-button" onClick={openNew} className="rounded-full bg-[#6D28D9] text-white font-semibold text-sm px-5 py-2.5 flex items-center gap-2 active:scale-95 transition-transform">
          <Plus className="h-4 w-4" /> New service
        </button>
      </div>

      <div className="p-8">
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : services.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Store className="h-10 w-10 text-gray-300 mb-3" />
            <h3 className="font-display text-xl font-bold text-gray-900">No services yet</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first service — it goes live after admin approval.</p>
            <button data-testid="empty-new-service" onClick={openNew} className="mt-6 rounded-full bg-[#6D28D9] text-white font-semibold text-sm px-6 py-3">Create service</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.id} data-testid={`provider-service-${s.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-32 bg-gray-100 relative">
                  {s.image_url && <img src={s.image_url} alt="" className="h-full w-full object-cover" />}
                  <span className="absolute top-3 right-3"><Badge status={s.status} /></span>
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full" style={{ background: `${catMeta(s.category).color}18`, color: catMeta(s.category).color }}>{catMeta(s.category).label}</span>
                  <h3 className="font-display text-lg font-bold text-gray-900 mt-1.5">{s.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Layers className="h-3 w-3" /> {s.items?.length || 0} items · {s.booking_count || 0} bookings</p>
                  <div className="flex gap-2 mt-3">
                    <button data-testid={`edit-service-${s.id}`} onClick={() => openEdit(s)} className="flex-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 text-sm font-medium transition-colors">Edit</button>
                    <button data-testid={`delete-service-${s.id}`} onClick={() => remove(s.id)} className="rounded-full border border-gray-200 text-gray-500 hover:text-red-500 px-3 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">{editId ? "Edit service" : "New service"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <input data-testid="service-title-input" className={inputCls} placeholder="Service title" value={svcForm.title} onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })} />
            <textarea data-testid="service-desc-input" className={inputCls} rows={2} placeholder="Description" value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select data-testid="service-category-select" className={inputCls} value={svcForm.category} onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input data-testid="service-location-input" className={inputCls} placeholder="Location" value={svcForm.location} onChange={(e) => setSvcForm({ ...svcForm, location: e.target.value })} />
            </div>
            <input data-testid="service-image-input" className={inputCls} placeholder="Image URL" value={svcForm.image_url} onChange={(e) => setSvcForm({ ...svcForm, image_url: e.target.value })} />

            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">Service items</p>
              <div className="space-y-2 mb-3">
                {items.map((it) => (
                  <div key={it.id} data-testid={`svc-item-${it.id}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span>{it.name} · {fmt(it.price)} · {it.duration_min}m</span>
                    <button type="button" data-testid={`remove-item-${it.id}`} onClick={() => removeLocalItem(it.id)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-gray-400">No items added yet.</p>}
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input data-testid="item-name-input" className={inputCls + " col-span-5"} placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
                <input data-testid="item-price-input" type="number" className={inputCls + " col-span-3"} placeholder="₹" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
                <input data-testid="item-duration-input" type="number" className={inputCls + " col-span-2"} placeholder="min" value={itemForm.duration_min} onChange={(e) => setItemForm({ ...itemForm, duration_min: e.target.value })} />
                <button type="button" data-testid="add-item-inline" onClick={addLocalItem} className="col-span-2 rounded-xl bg-[#6D28D9]/10 text-[#6D28D9] font-semibold text-sm flex items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <button data-testid="save-service-button" className="w-full h-11 rounded-full bg-[#6D28D9] text-white font-semibold active:scale-95 transition-transform">{editId ? "Save changes" : "Create service"}</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
