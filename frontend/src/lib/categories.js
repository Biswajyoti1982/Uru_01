export const CATEGORIES = [
  { id: "gym", label: "Gym Training" },
  { id: "sports", label: "Sports Coaching" },
  { id: "wellness", label: "Wellness & Other" },
];

export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label || id;
