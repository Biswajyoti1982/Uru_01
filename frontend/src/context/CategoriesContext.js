import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { resolveIcon, DEFAULT_ICON } from "@/lib/catmeta";

const CategoriesContext = createContext(null);

export const CategoriesProvider = ({ children }) => {
  const [raw, setRaw] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/categories");
      setRaw(res.data);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => raw.map((c) => ({ ...c, icon: resolveIcon(c.icon) })), [raw]);

  const catMeta = useCallback((id) => {
    const c = raw.find((x) => x.id === id);
    if (!c) return { id, label: id, icon: DEFAULT_ICON, color: "#6D28D9" };
    return { ...c, icon: resolveIcon(c.icon) };
  }, [raw]);

  const value = useMemo(() => ({ categories, catMeta, reloadCategories: load }), [categories, catMeta, load]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => useContext(CategoriesContext);
