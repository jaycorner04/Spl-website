export const adminSidebarSections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: "📊" },
      { label: "Analytics", path: "/admin/analytics", icon: "📈" },
      { label: "Announcements", path: "/admin/announcements", icon: "AN" },
      { label: "Franchises", path: "/admin/franchises", icon: "FR" },
      { label: "Sponsors", path: "/admin/sponsors", icon: "SP" },
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
    title: "Access",
    items: [
      { label: "Users & Roles", path: "/admin/users", icon: "UR" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance", path: "/admin/finance", icon: "💰" },
      { label: "Approvals", path: "/admin/approvals", icon: "✅" },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Change Password", path: "/admin/change-password", icon: "🔒" }],
  },
];
