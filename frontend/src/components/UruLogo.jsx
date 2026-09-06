import React from "react";

// The URU brand mark — lime rounded square with "URU" wordmark (matches Welcome splash).
export const UruLogo = ({ size = 40, className = "" }) => (
  <div
    className={`flex items-center justify-center font-black text-[#0B0E14] shrink-0 ${className}`}
    style={{
      width: size,
      height: size,
      fontSize: Math.round(size * 0.32),
      borderRadius: Math.round(size * 0.28),
      background: "linear-gradient(135deg, #D4FF00 0%, #9ECC00 100%)",
      boxShadow: "0 6px 16px rgba(212,255,0,0.35)",
      letterSpacing: "-0.5px",
    }}
  >
    URU
  </div>
);

export default UruLogo;
