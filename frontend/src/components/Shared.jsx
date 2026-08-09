import React from "react";

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="border-b border-white/10 bg-[#0d0d0d] sticky top-0 z-30 backdrop-blur-xl">
    <div className="px-8 py-6 flex items-end justify-between gap-4">
      <div>
        {subtitle && <span className="text-[10px] uppercase tracking-[0.3em] text-[#39FF14]">{subtitle}</span>}
        <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tight font-bold mt-1">{title}</h1>
      </div>
      {children}
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    {Icon && <Icon className="h-10 w-10 text-white/20 mb-4" />}
    <h3 className="font-display text-2xl uppercase tracking-tight font-bold text-white/80">{title}</h3>
    {desc && <p className="text-white/40 text-sm mt-2 max-w-sm">{desc}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const StatusBadge = ({ status }) => {
  const map = {
    approved: "text-[#39FF14] border-[#39FF14]/40 bg-[#39FF14]/10",
    pending: "text-amber-400 border-amber-400/40 bg-amber-400/10",
    rejected: "text-red-400 border-red-400/40 bg-red-400/10",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 border ${map[status] || "text-white/50 border-white/20"}`}>
      {status}
    </span>
  );
};
