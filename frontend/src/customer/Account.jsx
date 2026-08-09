import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Store, ShieldCheck, BadgePlus, LogOut, ChevronRight, Mail, Clock, CheckCircle2 } from "lucide-react";

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const isProvider = user?.provider_status === "approved";
  const pending = user?.provider_status === "pending";

  const Row = ({ icon: Icon, label, sub, onClick, testid, danger }) => (
    <button data-testid={testid} onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 bg-white active:bg-gray-50 transition-colors">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${danger ? "bg-red-50" : "bg-[#6D28D9]/10"}`}>
        <Icon className={`h-4 w-4 ${danger ? "text-red-500" : "text-[#6D28D9]"}`} />
      </div>
      <div className="text-left flex-1">
        <p className={`text-sm font-medium ${danger ? "text-red-500" : "text-gray-900"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      {!danger && <ChevronRight className="h-4 w-4 text-gray-300" />}
    </button>
  );

  return (
    <div>
      <div className="bg-[#6D28D9] text-white px-5 pt-8 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{user?.name}</h1>
            <p className="text-sm text-white/80 flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {user?.email}</p>
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded-full">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {(isProvider || isAdmin) && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
            {isProvider && <Row testid="account-provider-console" icon={Store} label="Provider console" sub="Manage your services & bookings" onClick={() => navigate("/manage/provider/services")} />}
            {isAdmin && <Row testid="account-admin-console" icon={ShieldCheck} label="Admin console" sub="Approvals & moderation" onClick={() => navigate("/manage/admin")} />}
          </div>
        )}

        {!isProvider && !isAdmin && (
          <div className="rounded-2xl overflow-hidden border border-gray-100">
            {pending ? (
              <div className="px-4 py-4 bg-amber-50 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div><p className="text-sm font-medium text-gray-900">Application under review</p><p className="text-xs text-gray-500">We'll notify you once approved.</p></div>
              </div>
            ) : user?.provider_status === "rejected" ? (
              <div className="px-4 py-4 bg-red-50 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-red-400" />
                <div><p className="text-sm font-medium text-gray-900">Application not approved</p></div>
              </div>
            ) : (
              <Row testid="account-become-provider" icon={BadgePlus} label="Become a provider" sub="List your services on URU" onClick={() => navigate("/app/become-provider")} />
            )}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden border border-gray-100">
          <Row testid="account-logout" icon={LogOut} label="Log out" onClick={logout} danger />
        </div>

        <p className="text-center text-xs text-gray-300 pt-2">URU · v1.0</p>
      </div>
    </div>
  );
}
