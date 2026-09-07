import React, { useState } from "react";
import { toast } from "sonner";
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, CATEGORY_COLORS } from "@/lib/exerciseLibrary";
import { Plus, X } from "lucide-react";

// Compact, reusable exercise selector. `picked` is [{name, category}].
export default function ExercisePicker({ picked, setPicked }) {
  const [activeCat, setActiveCat] = useState(EXERCISE_LIBRARY[0].category);
  const [customName, setCustomName] = useState("");
  const [customCat, setCustomCat] = useState("Other");

  const has = (name) => picked.some((p) => p.name === name);
  const toggle = (name, category) => setPicked(has(name) ? picked.filter((x) => x.name !== name) : [...picked, { name, category }]);
  const addCustom = () => {
    const n = customName.trim();
    if (!n) return;
    if (has(n)) return toast.error("Already added");
    setPicked([...picked, { name: n, category: customCat }]);
    setCustomName("");
  };
  const catExercises = EXERCISE_LIBRARY.find((c) => c.category === activeCat)?.exercises || [];

  return (
    <div>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {picked.map((p) => (
            <span key={p.name} className="text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: `${CATEGORY_COLORS[p.category] || "#9CA3AF"}22`, color: CATEGORY_COLORS[p.category] || "#9CA3AF" }}>
              {p.name}<button type="button" onClick={() => toggle(p.name, p.category)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {EXERCISE_LIBRARY.map((c) => (
          <button type="button" key={c.category} onClick={() => setActiveCat(c.category)} className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${activeCat === c.category ? "bg-[#F97316] text-white" : "bg-white/10 text-gray-400"}`}>{c.category}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {catExercises.map((ex) => (
          <button type="button" key={ex} onClick={() => toggle(ex, activeCat)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${has(ex) ? "bg-[#F97316] text-white border-[#F97316]" : "border-white/10 text-gray-300 hover:bg-white/5"}`}>{has(ex) ? "✓ " : "+ "}{ex}</button>
        ))}
      </div>
      <div className="flex gap-2 mt-2.5">
        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Custom exercise" className="flex-1 text-sm border border-white/10 bg-white/5 text-white placeholder:text-gray-500 rounded-xl px-3 py-2 outline-none focus:border-[#F97316]" />
        <select value={customCat} onChange={(e) => setCustomCat(e.target.value)} className="text-sm border border-white/10 bg-white/5 text-white rounded-xl px-2 py-2 outline-none focus:border-[#F97316]">
          {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" onClick={addCustom} className="rounded-xl bg-[#F97316]/10 text-[#F97316] px-3"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
