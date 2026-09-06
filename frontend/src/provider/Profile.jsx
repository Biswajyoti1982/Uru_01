import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { UserCog, Save } from "lucide-react";

const toArr = (str) => str.split(",").map((s) => s.trim()).filter(Boolean);

export default function ProviderProfile() {
  const { user, checkAuth } = useAuth();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      business_name: user.business_name || "",
      phone: user.phone || "",
      bio: user.bio || "",
      experience_years: user.experience_years || 0,
      age: user.age || 0,
      gender: (user.gender || "").toLowerCase(),
      avatar_url: user.avatar_url || user.picture || "",
      certifications: (user.certifications || []).join(", "),
      specialties: (user.specialties || []).join(", "),
      languages: (user.languages || []).join(", "),
    });
  }, [user]);

  if (!form) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  const save = async (e) => {
    e.preventDefault();
    if (!form.business_name.trim()) return toast.error("Business / coach name is required");
    setBusy(true);
    try {
      await api.put("/provider/profile", {
        business_name: form.business_name,
        phone: form.phone,
        bio: form.bio,
        experience_years: Number(form.experience_years) || 0,
        age: Number(form.age) || 0,
        gender: form.gender,
        avatar_url: form.avatar_url,
        certifications: toArr(form.certifications),
        specialties: toArr(form.specialties),
        languages: toArr(form.languages),
      });
      await checkAuth();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally { setBusy(false); }
  };

  const inputCls = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-[#6D28D9] outline-none";
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-3">
        <UserCog className="h-6 w-6 text-[#6D28D9]" />
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">My profile</h1>
          <p className="text-sm text-gray-500">This is what customers see on your public page</p>
        </div>
      </div>
      <div className="p-8 max-w-2xl">
        <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-4">
            <img src={form.avatar_url || "https://via.placeholder.com/80?text=URU"} alt="" className="h-20 w-20 rounded-2xl object-cover bg-gray-100" />
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Profile photo URL</label>
              <input data-testid="profile-avatar-input" className={inputCls} placeholder="https://…" value={form.avatar_url} onChange={set("avatar_url")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Business / coach name *</label>
              <input data-testid="profile-name-input" className={inputCls} value={form.business_name} onChange={set("business_name")} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Years of experience</label>
              <input data-testid="profile-experience-input" type="number" min="0" className={inputCls} value={form.experience_years} onChange={set("experience_years")} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
            <input data-testid="profile-phone-input" className={inputCls} value={form.phone} onChange={set("phone")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Age</label>
              <input data-testid="profile-age-input" type="number" min="0" className={inputCls} value={form.age} onChange={set("age")} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Gender</label>
              <select data-testid="profile-gender-input" className={inputCls} value={form.gender} onChange={set("gender")}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">About / bio</label>
            <textarea data-testid="profile-bio-input" rows={3} className={inputCls} value={form.bio} onChange={set("bio")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Certifications & qualifications <span className="text-gray-400">(comma separated)</span></label>
            <input data-testid="profile-certifications-input" className={inputCls} placeholder="e.g. ACE Certified, B.Ed" value={form.certifications} onChange={set("certifications")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Specialties / trainings <span className="text-gray-400">(comma separated)</span></label>
            <input data-testid="profile-specialties-input" className={inputCls} placeholder="e.g. Strength Training, Cricket" value={form.specialties} onChange={set("specialties")} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Languages <span className="text-gray-400">(comma separated)</span></label>
            <input data-testid="profile-languages-input" className={inputCls} placeholder="e.g. English, Hindi" value={form.languages} onChange={set("languages")} />
          </div>
          <button data-testid="save-profile-button" disabled={busy} className="w-full h-11 rounded-full bg-[#6D28D9] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
            <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
