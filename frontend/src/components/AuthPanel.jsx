import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Phone, Lock, User, ArrowRight, Loader2, KeyRound } from "lucide-react";

const fmtErr = (detail, fallback = "Something went wrong") => {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : "")).filter(Boolean).join(" ") || fallback;
  if (detail && typeof detail.msg === "string") return detail.msg;
  return fallback;
};

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const googleLogin = () => {
  const redirectUrl = window.location.origin + "/app";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

const inputCls = "w-full h-12 pl-11 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none border border-gray-200 rounded-xl focus:border-[#F97316] bg-white";

export default function AuthPanel() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [method, setMethod] = useState("password"); // password | otp
  const [mode, setMode] = useState("signin"); // signin | signup (password only)
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");

  const done = (data) => { setUser(data); navigate("/app", { replace: true, state: { user: data } }); };

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const url = mode === "signup" ? "/auth/register" : "/auth/login";
      const payload = mode === "signup" ? { name, phone, password } : { phone, password };
      const { data } = await api.post(url, payload);
      toast.success(mode === "signup" ? "Welcome to URU!" : "Welcome back!");
      done(data);
    } catch (err) {
      toast.error(fmtErr(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const requestOtp = async () => {
    if (phone.trim().length < 8) return toast.error("Enter a valid mobile number");
    setBusy(true);
    try {
      const { data } = await api.post("/auth/otp/request", { phone });
      setOtpSent(true);
      toast.info(data.message || "OTP sent");
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/otp/verify", { phone, code, name });
      toast.success("Verified!");
      done(data);
    } catch (err) { toast.error(fmtErr(err.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 p-5">
      {/* Method toggle */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-4">
        {[["password", "Password"], ["otp", "OTP"]].map(([id, label]) => (
          <button key={id} data-testid={`auth-method-${id}`} onClick={() => { setMethod(id); setOtpSent(false); }} className={`flex-1 h-9 rounded-full text-sm font-semibold transition-colors ${method === id ? "bg-white text-[#F97316] shadow-sm" : "text-gray-500"}`}>{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {method === "password" ? (
          <motion.form key="pw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submitPassword} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input data-testid="auth-name-input" className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input data-testid="auth-phone-input" type="tel" className={inputCls} placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input data-testid="auth-password-input" type="password" className={inputCls} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button data-testid="auth-password-submit" disabled={busy} className="w-full h-12 rounded-full bg-[#F97316] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Log in"} <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-center text-xs text-gray-500">
              {mode === "signup" ? "Already have an account? " : "New to URU? "}
              <button type="button" data-testid="auth-toggle-mode" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-semibold text-[#F97316]">{mode === "signup" ? "Log in" : "Create one"}</button>
            </p>
          </motion.form>
        ) : (
          <motion.form key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={verifyOtp} className="space-y-3">
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input data-testid="otp-phone-input" type="tel" className={inputCls} placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} />
            </div>
            {!otpSent ? (
              <button type="button" data-testid="otp-request-button" onClick={requestOtp} disabled={busy} className="w-full h-12 rounded-full bg-[#F97316] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
              </button>
            ) : (
              <>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input data-testid="otp-code-input" inputMode="numeric" className={inputCls + " tracking-[0.4em]"} placeholder="Enter 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">OTP delivery isn't wired up yet — use <b>123456</b> to continue.</p>
                <button data-testid="otp-verify-button" disabled={busy} className="w-full h-12 rounded-full bg-[#F97316] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify & continue <ArrowRight className="h-4 w-4" /></>}
                </button>
                <button type="button" data-testid="otp-change-number" onClick={() => { setOtpSent(false); setCode(""); }} className="w-full text-center text-xs font-medium text-gray-500">Change number</button>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button data-testid="landing-login-button" onClick={googleLogin} className="w-full h-12 rounded-full border border-gray-200 bg-white text-gray-800 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" /> Continue with Google
      </button>
      <p className="text-center text-xs text-gray-400 mt-4">By continuing you agree to URU's Terms & Privacy Policy</p>
    </div>
  );
}
