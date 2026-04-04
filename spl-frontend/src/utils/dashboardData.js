export const adminSidebarSections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: "📊" },
      { label: "Analytics", path: "/admin/analytics", icon: "📈" },
      { label: "Franchises", path: "/admin/franchises", icon: "FR" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Matches", path: "/admin/matches", icon: "🏏" },
      { label: "Players", path: "/admin/players", icon: "👥" },
      { label: "Teams", path: "/admin/teams", icon: "🏆" },
      { label: "Auction", path: "/admin/auction", icon: "🔨" },
      { label: "Live Match", path: "/admin/live-match", icon: "📡" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance", path: "/admin/finance", icon: "💰" },
      { label: "Approvals", path: "/admin/approvals", icon: "✅" },
    ],
  },
];
