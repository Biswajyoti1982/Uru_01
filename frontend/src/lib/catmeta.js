import {
  Scissors, Dumbbell, Palette, Swords, Footprints, Music, Guitar,
  HeartPulse, Waves, GraduationCap, Sparkles,
} from "lucide-react";

export const CATEGORIES = [
  { id: "salon", label: "Salon & Spa", icon: Scissors, color: "#EC4899" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, color: "#F97316" },
  { id: "art", label: "Drawing & Art", icon: Palette, color: "#8B5CF6" },
  { id: "karate", label: "Martial Arts", icon: Swords, color: "#EF4444" },
  { id: "skating", label: "Skating", icon: Footprints, color: "#06B6D4" },
  { id: "dance", label: "Dance", icon: Music, color: "#D946EF" },
  { id: "music", label: "Music", icon: Guitar, color: "#0EA5E9" },
  { id: "yoga", label: "Yoga", icon: HeartPulse, color: "#10B981" },
  { id: "swimming", label: "Swimming", icon: Waves, color: "#3B82F6" },
  { id: "tutoring", label: "Tutoring", icon: GraduationCap, color: "#6366F1" },
];

export const catMeta = (id) =>
  CATEGORIES.find((c) => c.id === id) || { id, label: id, icon: Sparkles, color: "#6D28D9" };
