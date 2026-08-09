export const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const fmtDate = (d) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
};
