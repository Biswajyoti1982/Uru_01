import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { resolveIcon, DEFAULT_ICON } from "@/lib/catmeta";

const CategoriesContext = createContext(null);

export const CategoriesProvider = ({ children }) => {
  const [raw, setRaw] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/categories");
      setRaw(res.data);
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = raw.map((c) => ({ ...c, icon: resolveIcon(c.icon) }));

  const catMeta = (id) => {
    const c = raw.find((x) => x.id === id);
    if (!c) return { id, label: id, icon: DEFAULT_ICON, color: "#6D28D9" };
    return { ...c, icon: resolveIcon(c.icon) };
  };

  return (
    <CategoriesContext.Provider value={{ categories, catMeta, reloadCategories: load }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => useContext(CategoriesContext);
