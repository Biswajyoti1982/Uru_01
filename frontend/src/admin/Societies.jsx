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

  const inputCls = "w-full text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2.5 focus:border-[#F97316] outline-none";

  return (
    <div>
      <div className="bg-[#0F1420] border-b border-white/10 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-white">Societies</h1>
        <p className="text-sm text-gray-400">Manage residential societies where physical classes are held</p>
      </div>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-white mb-4">All societies</h2>
          {societies.length === 0 ? (
            <p className="text-sm text-gray-500">No societies yet. Add one to enable physical classes.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {societies.map((s) => (
                <div key={s.id} data-testid={`society-item-${s.id}`} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-[#F97316]/10">
                    <Building2 className="h-5 w-5 text-[#F97316]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {s.area && <p className="text-xs text-gray-400">{s.area}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-white mb-4">New society</h2>
          <form onSubmit={create} className="bg-[#151A24] rounded-2xl border border-white/10 shadow-sm p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Name</label>
              <input data-testid="society-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Green Valley" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Area / City</label>
              <input data-testid="society-area-input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Andheri, Mumbai" className={inputCls} />
            </div>
            <button data-testid="create-society-button" disabled={busy} className="w-full h-11 rounded-full bg-[#F97316] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
              <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add society"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
