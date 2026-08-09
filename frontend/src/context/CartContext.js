import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);
const KEY = "uru_cart";

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (cart) localStorage.setItem(KEY, JSON.stringify(cart));
    else localStorage.removeItem(KEY);
  }, [cart]);

  // service = {id, title, image_url, provider_name, category}
  const addItem = (service, item) => {
    setCart((prev) => {
      if (!prev || prev.serviceId !== service.id) {
        return { serviceId: service.id, service, lines: { [item.id]: { item, qty: 1 } } };
      }
      const lines = { ...prev.lines };
      lines[item.id] = { item, qty: (lines[item.id]?.qty || 0) + 1 };
      return { ...prev, lines };
    });
  };

  const decItem = (itemId) => {
    setCart((prev) => {
      if (!prev) return prev;
      const lines = { ...prev.lines };
      const cur = lines[itemId];
      if (!cur) return prev;
      if (cur.qty <= 1) delete lines[itemId];
      else lines[itemId] = { ...cur, qty: cur.qty - 1 };
      if (Object.keys(lines).length === 0) return null;
      return { ...prev, lines };
    });
  };

  const clearCart = () => setCart(null);

  const count = cart ? Object.values(cart.lines).reduce((a, l) => a + l.qty, 0) : 0;
  const total = cart ? Object.values(cart.lines).reduce((a, l) => a + l.item.price * l.qty, 0) : 0;

  return (
    <CartContext.Provider value={{ cart, addItem, decItem, clearCart, count, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
