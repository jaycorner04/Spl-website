export function formatCurrency(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTeamId(id) {
  return `TM${String(id).padStart(2, "0")}`;
}

export function formatFranchiseId(id) {
  return `FR${String(id).padStart(2, "0")}`;
}

export function formatPlayerId(id) {
  return `PL${String(id).padStart(3, "0")}`;
}

export function formatMatchId(id) {
  return `M${String(id).padStart(3, "0")}`;
}

export function getBadgeColor(status) {
  const colorMap = {
    Active: "green",
    Pending: "orange",
    Review: "purple",
    Suspended: "red",
    Injured: "orange",
    Live: "red",
    Upcoming: "blue",
    Draft: "purple",
    Completed: "green",
  };

  return colorMap[status] || "slate";
}
