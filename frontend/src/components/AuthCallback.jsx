import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");

    const run = async () => {
      try {
        const res = await api.post("/auth/session", null, {
          headers: { "X-Session-ID": sessionId },
        });
        setUser(res.data);
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/app", { replace: true, state: { user: res.data } });
      } catch (e) {
        navigate("/", { replace: true });
      }
    };
    if (sessionId) run();
    else navigate("/", { replace: true });
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="text-center">
        <div className="h-1 w-40 bg-white/10 overflow-hidden mb-4 mx-auto">
          <div className="h-full w-1/2 bg-[#39FF14] animate-pulse" />
        </div>
        <p className="text-white/60 uppercase tracking-[0.2em] text-xs">Signing you in</p>
      </div>
    </div>
  );
}
