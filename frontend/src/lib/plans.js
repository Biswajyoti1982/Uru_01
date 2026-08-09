export const PLANS = [
  { id: "monthly", label: "Monthly", months: 1, discount: 0 },
  { id: "quarterly", label: "Quarterly", months: 3, discount: 0.1 },
  { id: "yearly", label: "Yearly", months: 12, discount: 0.2 },
];

export const planById = (id) => PLANS.find((p) => p.id === id) || PLANS[0];
export const planTotal = (perMonth, plan) => Math.round(perMonth * plan.months * (1 - plan.discount));
