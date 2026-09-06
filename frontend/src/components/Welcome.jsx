import React from "react";
import { useNavigate } from "react-router-dom";

const CSS = `
.uruw-root { position: fixed; inset: 0; z-index: 60; background: #05070A; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.uruw-glow { position: absolute; width: 320px; height: 320px; background: radial-gradient(circle, rgba(212,255,0,0.18) 0%, rgba(0,0,0,0) 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); animation: uruwPulse 3s infinite alternate ease-in-out; }
.uruw-card { width: 85%; max-width: 340px; padding: 40px 26px 30px; background: rgba(22,27,34,0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(212,255,0,0.35); border-radius: 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(212,255,0,0.15); position: relative; z-index: 2; opacity: 0; animation: uruwCard 0.6s ease-out 0.2s forwards; }
.uruw-icon { width: 68px; height: 68px; margin: 0 auto 20px; background: linear-gradient(135deg, #D4FF00 0%, #9ECC00 100%); border-radius: 18px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; color: #0B0E14; box-shadow: 0 10px 25px rgba(212,255,0,0.4); opacity: 0; animation: uruwLogo 0.9s cubic-bezier(0.175,0.885,0.32,1.275) 0.6s forwards; }
.uruw-title { color: #fff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 12px; opacity: 0; animation: uruwOne 0.8s cubic-bezier(0.34,1.56,0.64,1) 1.5s forwards; }
.uruw-title span { color: #D4FF00; text-shadow: 0 0 12px rgba(212,255,0,0.5); }
.uruw-tag { color: #A0AEC0; font-size: 15px; line-height: 1.45; margin-bottom: 28px; opacity: 0; animation: uruwTwo 0.8s cubic-bezier(0.25,1.15,0.5,1.15) 3.5s forwards; }
.uruw-btn { display: block; width: 100%; padding: 15px 0; background: #D4FF00; color: #0B0E14; font-weight: 800; font-size: 15px; letter-spacing: 0.3px; border: none; border-radius: 14px; cursor: pointer; box-shadow: 0 4px 18px rgba(212,255,0,0.35); opacity: 0; animation: uruwBtn 0.5s ease 4.3s forwards; transition: transform 0.2s, box-shadow 0.2s; }
.uruw-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(212,255,0,0.5); }
.uruw-btn:active { transform: translateY(1px); }
.uruw-skip { position: absolute; top: 18px; right: 20px; z-index: 3; color: #64748B; background: none; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
@keyframes uruwCard { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes uruwLogo { 0% { opacity: 0; transform: scale(0.2) translateY(-80px) rotate(-15deg); } 50% { opacity: 1; transform: scale(1.35) translateY(15px) rotate(5deg); } 75% { transform: scale(0.9) translateY(-5px) rotate(-2deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); } }
@keyframes uruwOne { 0% { opacity: 0; transform: scale(0.6) translateY(25px); filter: blur(4px); } 70% { opacity: 1; transform: scale(1.08) translateY(-4px); filter: blur(0); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); } }
@keyframes uruwTwo { 0% { opacity: 0; transform: translateY(30px) scale(0.92); filter: blur(3px); } 70% { opacity: 1; transform: translateY(-3px) scale(1.03); filter: blur(0); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
@keyframes uruwBtn { 0% { opacity: 0; transform: translateY(10px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes uruwPulse { from { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 0.85; transform: translate(-50%, -50%) scale(1.1); } }
`;

export default function Welcome() {
  const navigate = useNavigate();
  const done = () => {
    sessionStorage.setItem("uru_welcomed", "1");
    navigate("/app");
  };
  return (
    <div className="uruw-root" data-testid="welcome-splash">
      <style>{CSS}</style>
      <div className="uruw-glow" />
      <button className="uruw-skip" data-testid="welcome-skip" onClick={done}>Skip</button>
      <div className="uruw-card">
        <div className="uruw-icon">URU</div>
        <h1 className="uruw-title">Welcome to <span>URU</span></h1>
        <p className="uruw-tag">Perfect place to start your fitness journey.</p>
        <button className="uruw-btn" data-testid="welcome-continue" onClick={done}>Continue</button>
      </div>
    </div>
  );
}
