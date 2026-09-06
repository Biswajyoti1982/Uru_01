import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, BadgePlus } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const toArr = (str) => str.split(",").map((s) => s.trim()).filter(Boolean);

export default function Onboard() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", bio: "", phone: "", experience_years: "", age: "", gender: "", certifications: "", specialties: "", languages: "", avatar_url: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.business_name.trim()) return toast.error("Business name is required");
    setBusy(true);
    try {
      await api.post("/provider/apply", {
        business_name: form.business_name,
        bio: form.bio,
        phone: form.phone,
        experience_years: Number(form.experience_years) || 0,
        age: Number(form.age) || 0,
        gender: form.gender,
        avatar_url: form.avatar_url,
        certifications: toArr(form.certifications),
        specialties: toArr(form.specialties),
        languages: toArr(form.languages),
      });
      await checkAuth();
      toast.success("Application submitted for review");
      navigate("/app/account");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not submit");
    } finally { setBusy(false); }
  };

  const inputCls = "w-full text-sm text-gray-800 placeholder:text-gray-400 outline-none border border-gray-200 rounded-xl px-4 py-3 focus:border-[#6D28D9]";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="onboard-back" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
        <h1 className="font-display text-lg font-bold text-gray-900">Become a provider</h1>
      </div>
      <form onSubmit={submit} className="px-5 mt-5 space-y-4 pb-10">
        <div className="bg-[#6D28D9]/8 border border-[#6D28D9]/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#6D28D9] flex items-center justify-center"><BadgePlus className="h-4 w-4 text-white" /></div>
          <p className="text-xs text-gray-600">List your classes on URU. An admin reviews your details before you go live.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business / Coach name *</label>
          <input data-testid="onboard-business-name" className={inputCls} placeholder="e.g. FitZone Academy" value={form.business_name} onChange={set("business_name")} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bio</label>
          <textarea data-testid="onboard-bio" rows={3} className={inputCls} placeholder="What do you offer?" value={form.bio} onChange={set("bio")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Experience (years)</label>
            <input data-testid="onboard-experience" type="number" min="0" className={inputCls} placeholder="e.g. 8" value={form.experience_years} onChange={set("experience_years")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
            <input data-testid="onboard-phone" className={inputCls} placeholder="+91 90000 00000" value={form.phone} onChange={set("phone")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Age</label>
            <input data-testid="onboard-age" type="number" min="0" className={inputCls} placeholder="e.g. 30" value={form.age} onChange={set("age")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Gender</label>
            <select data-testid="onboard-gender" className={inputCls} value={form.gender} onChange={set("gender")}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Certifications / qualifications <span className="text-gray-400">(comma separated)</span></label>
          <input data-testid="onboard-certifications" className={inputCls} placeholder="e.g. ACE Certified, B.Ed" value={form.certifications} onChange={set("certifications")} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Specialties / trainings <span className="text-gray-400">(comma separated)</span></label>
          <input data-testid="onboard-specialties" className={inputCls} placeholder="e.g. Strength Training, Cricket" value={form.specialties} onChange={set("specialties")} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Languages <span className="text-gray-400">(comma separated)</span></label>
          <input data-testid="onboard-languages" className={inputCls} placeholder="e.g. English, Hindi" value={form.languages} onChange={set("languages")} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Profile photo URL</label>
          <input data-testid="onboard-avatar" className={inputCls} placeholder="https://…" value={form.avatar_url} onChange={set("avatar_url")} />
        </div>
        <button data-testid="onboard-submit" disabled={busy} className="w-full h-12 rounded-full bg-[#6D28D9] text-white font-semibold disabled:opacity-50 active:scale-95 transition-transform">
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
