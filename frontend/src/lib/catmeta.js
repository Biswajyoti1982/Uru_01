import {
  Dumbbell, Swords, Target, Goal, Footprints, Palette, Guitar,
  GraduationCap, Music, HeartPulse, Waves, Scissors, Sparkles,
} from "lucide-react";

export const ICON_MAP = {
  dumbbell: Dumbbell,
  swords: Swords,
  target: Target,
  goal: Goal,
  footprints: Footprints,
  palette: Palette,
  guitar: Guitar,
  "graduation-cap": GraduationCap,
  music: Music,
  "heart-pulse": HeartPulse,
  waves: Waves,
  scissors: Scissors,
  sparkles: Sparkles,
};

export const ICON_OPTIONS = [
  "dumbbell", "swords", "target", "goal", "footprints",
  "palette", "guitar", "graduation-cap", "music", "waves", "sparkles",
];

export const DEFAULT_ICON = Sparkles;
export const resolveIcon = (name) => ICON_MAP[name] || DEFAULT_ICON;
