import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { fmt } from "@/lib/format";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, addItem, decItem, clearCart, count, total } = useCart();

  if (!cart || count === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <ShoppingBag className="h-7 w-7 text-gray-300" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-sm text-gray-500 mt-1">Add services to get started.</p>
        <button data-testid="cart-browse-button" onClick={() => navigate("/app")} className="mt-6 px-6 py-3 rounded-full bg-[#6D28D9] text-white font-semibold text-sm active:scale-95 transition-transform">
          Browse services
        </button>
      </div>
    );
  }

  const svcCtx = cart.service;
  const lines = Object.values(cart.lines);

  return (
    <div className="pb-28">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-30">
        <button data-testid="cart-back" onClick={() => navigate(-1)} className="active:scale-90 transition-transform"><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
        <h1 className="font-display text-lg font-bold text-gray-900">Your cart</h1>
        <button data-testid="cart-clear" onClick={clearCart} className="ml-auto text-xs font-medium text-red-500 flex items-center gap-1">
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div className="px-5 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <img src={svcCtx.image_url} alt={svcCtx.title} className="h-14 w-14 rounded-xl object-cover" />
          <div>
            <p className="font-semibold text-gray-900">{svcCtx.title}</p>
            <p className="text-xs text-gray-500">{svcCtx.provider_name}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((l) => (
            <div key={l.item.id} data-testid={`cart-line-${l.item.id}`} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{l.item.name}</p>
                <p className="text-sm text-gray-500">{fmt(l.item.price)}</p>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-[#6D28D9] text-white px-2 py-1.5">
                <button data-testid={`cart-dec-${l.item.id}`} onClick={() => decItem(l.item.id)}><Minus className="h-4 w-4" /></button>
                <span className="text-sm font-semibold w-4 text-center">{l.qty}</span>
                <button data-testid={`cart-inc-${l.item.id}`} onClick={() => addItem(svcCtx, l.item)}><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Item total</span><span>{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Taxes & fees</span><span>{fmt(0)}</span>
          </div>
          <div className="border-t border-dashed border-gray-200 my-3" />
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span><span data-testid="cart-total">{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-40">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-base font-bold text-gray-900">{fmt(total)}</p>
        </div>
        <button
          data-testid="proceed-checkout-button"
          onClick={() => navigate("/app/checkout")}
          className="px-8 py-3 rounded-full bg-[#6D28D9] text-white font-semibold text-sm active:scale-95 transition-transform"
        >
          Proceed
        </button>
      </div>
    </div>
  );
}
