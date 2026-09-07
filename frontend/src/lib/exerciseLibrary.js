// Predefined exercises the trainer can pick from; they can also add custom ones.
export const EXERCISE_LIBRARY = [
  { category: "Chest", exercises: ["Bench Press", "Incline Dumbbell Press", "Chest Fly", "Push-ups", "Cable Crossover"] },
  { category: "Back", exercises: ["Deadlift", "Pull-ups", "Bent-over Row", "Lat Pulldown", "Seated Cable Row"] },
  { category: "Legs", exercises: ["Squat", "Leg Press", "Lunges", "Leg Curl", "Leg Extension", "Calf Raise"] },
  { category: "Shoulders", exercises: ["Overhead Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Shrugs"] },
  { category: "Arms", exercises: ["Barbell Curl", "Hammer Curl", "Tricep Pushdown", "Skull Crushers", "Dips"] },
  { category: "Core", exercises: ["Plank", "Crunches", "Hanging Leg Raise", "Russian Twist", "Cable Woodchop"] },
  { category: "Cardio", exercises: ["Treadmill Run", "Cycling", "Rowing", "Jump Rope", "HIIT Circuit"] },
  { category: "Full Body", exercises: ["Burpees", "Kettlebell Swing", "Clean & Press", "Battle Ropes"] },
  { category: "Mobility", exercises: ["Foam Rolling", "Dynamic Stretch", "Yoga Flow", "Hip Openers"] },
];

export const EXERCISE_CATEGORIES = EXERCISE_LIBRARY.map((c) => c.category).concat("Other");

export const CATEGORY_COLORS = {
  Chest: "#F97316", Back: "#3B82F6", Legs: "#22C55E", Shoulders: "#A855F7",
  Arms: "#EAB308", Core: "#EC4899", Cardio: "#EF4444", "Full Body": "#06B6D4",
  Mobility: "#14B8A6", Other: "#9CA3AF",
};
