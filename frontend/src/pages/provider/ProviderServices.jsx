import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { PageHeader, EmptyState, StatusBadge } from "@/components/Shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Store, Plus, Trash2, CalendarPlus, Clock, Calendar, Users, X } from "lucide-react";

const fmtDate = (d) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
  catch { return d; }
};

const empty = { title: "", description: "", category: "gym", image_url: "", level: "All Levels", location: "" };
const emptyClass = { title: "", date: "", start_time: "", end_time: "", capacity: 10 };

export default function ProviderServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcForm, setSvcForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [schedOpen, setSchedOpen] = useState(false);
  const [activeSvc, setActiveSvc] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classForm, setClassForm] = useState(emptyClass);

  const load = async () => {
    setLoading(true);
    try { setServices((await api.get("/provider/services")).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setSvcForm(empty); setEditId(null); setSvcOpen(true); };
  const openEdit = (s) => { setSvcForm({ title: s.title, description: s.description, category: s.category, image_url: s.image_url, level: s.level, location: s.location }); setEditId(s.id); setSvcOpen(true); };

  const saveService = async (e) => {
    e.preventDefault();
    if (!svcForm.title.trim()) return toast.error("Title required");
    try {
      if (editId) await api.put(`/provider/services/${editId}`, svcForm);
      else await api.post("/provider/services", svcForm);
      toast.success(editId ? "Service updated — pending review" : "Service created — pending admin approval");
      setSvcOpen(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeService = async (id) => {
    if (!window.confirm("Delete this service and all its classes?")) return;
    await api.delete(`/provider/services/${id}`);
    toast.success("Deleted");
    load();
  };

  const openSchedule = async (s) => {
    setActiveSvc(s);
    setClassForm(emptyClass);
    setSchedOpen(true);
    setClasses((await api.get(`/provider/services/${s.id}/classes`)).data);
  };

  const addClass = async (e) => {
    e.preventDefault();
    const { title, date, start_time, end_time } = classForm;
    if (!title || !date || !start_time || !end_time) return toast.error("Fill all class fields");
    try {
      await api.post(`/provider/services/${activeSvc.id}/classes`, { ...classForm, capacity: Number(classForm.capacity) });
      toast.success("Class added");
      setClassForm(emptyClass);
      setClasses((await api.get(`/provider/services/${activeSvc.id}/classes`)).data);
      load();
    } catch { toast.error("Failed to add class"); }
  };

  const removeClass = async (id) => {
    await api.delete(`/provider/classes/${id}`);
    setClasses((await api.get(`/provider/services/${activeSvc.id}/classes`)).data);
    load();
  };

  const inputCls = "w-full bg-[#0A0A0A] border border-white/10 text-white px-4 py-3 focus:border-[#39FF14] focus:outline-none focus:ring-1 focus:ring-[#39FF14]";

  return (
    <div>
      <PageHeader title="My Services" subtitle="Manage your offerings">
        <button data-testid="new-service-button" onClick={openNew} className="bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs px-5 py-2.5 hover:bg-[#32E612] transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Service
        </button>
      </PageHeader>

      <div className="p-8">
        {loading ? (
          <p className="text-white/40 uppercase tracking-widest text-xs">Loading…</p>
        ) : services.length === 0 ? (
          <EmptyState icon={Store} title="No services yet" desc="Create your first service. It goes live after admin approval." action={<button data-testid="empty-new-service" onClick={openNew} className="bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs px-6 py-3 hover:bg-[#32E612] transition-colors">Create Service</button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.id} data-testid={`provider-service-${s.id}`} className="border border-white/10 bg-[#141414] overflow-hidden">
                <div className="h-36 bg-black relative">
                  {s.image_url && <img src={s.image_url} alt={s.title} className="h-full w-full object-cover opacity-70" />}
                  <span className="absolute top-3 right-3"><StatusBadge status={s.status} /></span>
                  {!s.is_visible && <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest bg-black/70 text-white/60 px-2 py-1 border border-white/20">Hidden</span>}
                </div>
                <div className="p-5">
                  <span className="text-[10px] uppercase tracking-widest text-[#39FF14]">{categoryLabel(s.category)}</span>
                  <h3 className="font-display text-2xl uppercase tracking-tight font-bold mt-1">{s.title}</h3>
                  <p className="text-white/50 text-sm mt-1">{s.class_count} classes scheduled</p>
                  <div className="flex gap-2 mt-4">
                    <button data-testid={`schedule-button-${s.id}`} onClick={() => openSchedule(s)} className="flex-1 border border-white/20 text-white/70 hover:bg-white/10 py-2 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1 transition-colors">
                      <CalendarPlus className="h-3.5 w-3.5" /> Schedule
                    </button>
                    <button data-testid={`edit-service-${s.id}`} onClick={() => openEdit(s)} className="border border-white/20 text-white/70 hover:bg-white/10 px-3 text-xs uppercase tracking-widest font-bold transition-colors">Edit</button>
                    <button data-testid={`delete-service-${s.id}`} onClick={() => removeService(s.id)} className="border border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/40 px-3 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service dialog */}
      <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-2xl uppercase tracking-tight">{editId ? "Edit Service" : "New Service"}</DialogTitle></DialogHeader>
          <form onSubmit={saveService} className="space-y-4">
            <input data-testid="service-title-input" className={inputCls} placeholder="Title" value={svcForm.title} onChange={(e) => setSvcForm({ ...svcForm, title: e.target.value })} />
            <textarea data-testid="service-desc-input" className={inputCls} rows={2} placeholder="Description" value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <select data-testid="service-category-select" className={inputCls} value={svcForm.category} onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id} className="bg-[#141414]">{c.label}</option>)}
              </select>
              <input data-testid="service-level-input" className={inputCls} placeholder="Level" value={svcForm.level} onChange={(e) => setSvcForm({ ...svcForm, level: e.target.value })} />
            </div>
            <input data-testid="service-location-input" className={inputCls} placeholder="Location" value={svcForm.location} onChange={(e) => setSvcForm({ ...svcForm, location: e.target.value })} />
            <input data-testid="service-image-input" className={inputCls} placeholder="Image URL (optional)" value={svcForm.image_url} onChange={(e) => setSvcForm({ ...svcForm, image_url: e.target.value })} />
            <button data-testid="save-service-button" className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-widest text-sm py-3 hover:bg-[#32E612] transition-colors">{editId ? "Save Changes" : "Create Service"}</button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-2xl uppercase tracking-tight">Schedule — {activeSvc?.title}</DialogTitle></DialogHeader>
          <form onSubmit={addClass} className="grid grid-cols-2 gap-3 border border-white/10 p-4">
            <input data-testid="class-title-input" className={inputCls + " col-span-2"} placeholder="Class title" value={classForm.title} onChange={(e) => setClassForm({ ...classForm, title: e.target.value })} />
            <input data-testid="class-date-input" type="date" className={inputCls} value={classForm.date} onChange={(e) => setClassForm({ ...classForm, date: e.target.value })} />
            <input data-testid="class-capacity-input" type="number" min="1" className={inputCls} placeholder="Capacity" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} />
            <input data-testid="class-start-input" type="time" className={inputCls} value={classForm.start_time} onChange={(e) => setClassForm({ ...classForm, start_time: e.target.value })} />
            <input data-testid="class-end-input" type="time" className={inputCls} value={classForm.end_time} onChange={(e) => setClassForm({ ...classForm, end_time: e.target.value })} />
            <button data-testid="add-class-button" className="col-span-2 bg-[#39FF14] text-black font-bold uppercase tracking-widest text-xs py-2.5 hover:bg-[#32E612] transition-colors flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add Class</button>
          </form>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {classes.length === 0 ? <p className="text-white/40 text-sm py-4 text-center">No classes yet.</p> : classes.map((cl) => (
              <div key={cl.id} data-testid={`provider-class-${cl.id}`} className="flex items-center justify-between border border-white/10 p-3 text-sm">
                <div>
                  <p className="font-medium">{cl.title}</p>
                  <div className="flex gap-3 text-xs text-white/40 uppercase tracking-wider mt-1">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(cl.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {cl.start_time}–{cl.end_time}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {cl.enrolled_count}/{cl.capacity}</span>
                  </div>
                </div>
                <button data-testid={`delete-class-${cl.id}`} onClick={() => removeClass(cl.id)} className="text-white/40 hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
