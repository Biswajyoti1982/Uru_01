import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarCheck, User, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { fmt } from "@/lib/format";

const TABS = [
  { to: "/app", icon: Home, label: "Home", testid: "tab-home", exact: true },
  { to: "/app/bookings", icon: CalendarCheck, label: "Bookings", testid: "tab-bookings" },
  { to: "/app/account", icon: User, label: "Account", testid: "tab-account" },
];

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, count, total } = useCart();

  const isActive = (t) => (t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to));
  const focused = location.pathname.includes("/cart") || location.pathname.includes("/checkout");
  const hideCartBar = focused || !cart || count === 0;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gray-50 sm:border-x sm:border-gray-200 flex flex-col relative">
      <div className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </div>

      {/* Floating cart bar */}
      {!hideCartBar && (
        <div className="absolute bottom-[76px] left-0 w-full px-4 z-40">
          <button
            data-testid="floating-cart-bar"
            onClick={() => navigate("/app/cart")}
            className="w-full bg-[#6D28D9] text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg shadow-[#6D28D9]/30 active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="h-4 w-4" /> {count} item{count > 1 ? "s" : ""} · {fmt(total)}
            </span>
            <span className="text-sm font-semibold">View cart →</span>
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      {!focused && (
        <nav className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around items-center pt-2 pb-3 z-50 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)]">
          {TABS.map((t) => {
            const active = isActive(t);
            return (
              <button
                key={t.to}
                data-testid={t.testid}
                onClick={() => navigate(t.to)}
                className="flex flex-col items-center gap-1 px-4 py-1 min-w-[64px] active:scale-95 transition-transform"
              >
                <t.icon className={`h-5 w-5 ${active ? "text-[#6D28D9]" : "text-gray-400"}`} />
                <span className={`text-[11px] font-medium ${active ? "text-[#6D28D9]" : "text-gray-400"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
