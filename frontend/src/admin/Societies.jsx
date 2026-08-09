import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Plus, Building2 } from "lucide-react";

export default function AdminSocieties() {
  const [societies, setSocieties] = useState([]);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => setSocieties((await api.get("/societies")).data);
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Society name is required");
    setBusy(true);
    try {
      await api.post("/admin/societies", { name, area });
      toast.success("Society added");
      setName(""); setArea("");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-gray-900">Societies</h1>
        <p className="text-sm text-gray-500">Manage residential societies where physical classes are held</p>
      </div>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">All societies</h2>
          {societies.length === 0 ? (
            <p className="text-sm text-gray-400">No societies yet. Add one to enable physical classes.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {societies.map((s) => (
                <div key={s.id} data-testid={`society-item-${s.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#6D28D9]/10">
                    <Building2 className="h-5 w-5 text-[#6D28D9]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    {s.area && <p className="text-xs text-gray-500">{s.area}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-gray-900 mb-4">New society</h2>
          <form onSubmit={create} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Name</label>
              <input data-testid="society-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Valley" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#6D28D9] outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Area / City</label>
              <input data-testid="society-area-input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Andheri, Mumbai" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#6D28D9] outline-none" />
            </div>
            <button data-testid="create-society-button" disabled={busy} className="w-full h-11 rounded-full bg-[#6D28D9] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add society"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
