import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/Shared";
import { BadgePlus, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function BecomeProvider() {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", bio: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const status = user?.provider_status;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.business_name.trim()) return toast.error("Business name is required");
    setBusy(true);
    try {
      await api.post("/provider/apply", form);
      await checkAuth();
      toast.success("Application submitted for review");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not submit");
    } finally { setBusy(false); }
  };

  const StatusView = ({ icon: Icon, color, title, desc }) => (
    <div className="max-w-lg border border-white/10 bg-[#141414] p-10 text-center">
      <Icon className={`h-12 w-12 mx-auto mb-4 ${color}`} />
      <h2 className="font-display text-3xl uppercase tracking-tight font-bold">{title}</h2>
      <p className="text-white/50 mt-3">{desc}</p>
    </div>
  );

  return (
    <div>
      <PageHeader title="Become a Provider" subtitle="Offer your classes" />
      <div className="p-8 flex justify-center">
        {status === "pending" ? (
          <StatusView icon={Clock} color="text-amber-400" title="Application Under Review" desc="An admin is reviewing your application. You'll be able to publish services once approved." />
        ) : status === "rejected" ? (
          <StatusView icon={XCircle} color="text-red-400" title="Application Rejected" desc="Your application was not approved. Contact support for details." />
        ) : status === "approved" ? (
          <StatusView icon={CheckCircle2} color="text-[#39FF14]" title="You're Approved" desc="Head to My Services to publish your classes." />
        ) : (
          <form onSubmit={submit} className="w-full max-w-lg border border-white/10 bg-[#141414] p-8">
            <BadgePlus className="h-8 w-8 text-[#39FF14] mb-4" />
            <p className="text-white/60 text-sm mb-6">Tell us about your practice. An admin will verify your details before your classes go live.</p>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Business / Coach Name *</label>
            <input
              data-testid="apply-business-name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-white/10 text-white px-4 py-3 mb-4 focus:border-[#39FF14] focus:outline-none focus:ring-1 focus:ring-[#39FF14]"
              placeholder="Iron Forge Athletics"
            />
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Bio</label>
            <textarea
              data-testid="apply-bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full bg-[#0A0A0A] border border-white/10 text-white px-4 py-3 mb-4 focus:border-[#39FF14] focus:outline-none focus:ring-1 focus:ring-[#39FF14]"
              placeholder="Certified strength coach, 10+ years…"
            />
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Phone</label>
            <input
              data-testid="apply-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-white/10 text-white px-4 py-3 mb-6 focus:border-[#39FF14] focus:outline-none focus:ring-1 focus:ring-[#39FF14]"
              placeholder="+1 555 0100"
            />
            <button
              data-testid="apply-submit-button"
              disabled={busy}
              className="w-full bg-[#39FF14] text-black font-bold uppercase tracking-widest text-sm py-3.5 hover:bg-[#32E612] transition-colors disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
