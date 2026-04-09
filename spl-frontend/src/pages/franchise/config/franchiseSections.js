export const DEFAULT_FRANCHISE_SECTION = "dashboard";

export const franchiseSidebarSections = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        path: "/franchise",
        section: "dashboard",
        icon: "DB",
      },
    ],
  },
  {
    title: "Registration",
    items: [
      {
        label: "Team Registration",
        path: "/franchise",
        section: "team-registration",
        icon: "TR",
      },
      {
        label: "Player Registration",
        path: "/franchise",
        section: "player-registration",
        icon: "PR",
      },
    ],
  },
  {
    title: "Squad",
    items: [
      {
        label: "Player Information",
        path: "/franchise",
        section: "player-information",
        icon: "PI",
      },
      {
        label: "Teams",
        path: "/franchise",
        section: "teams",
        icon: "TM",
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        label: "Team Performance",
        path: "/franchise",
        section: "team-performance",
        icon: "TP",
      },
      {
        label: "Match Reports",
        path: "/franchise",
        section: "match-reports",
        icon: "MR",
      },
    ],
  },
];

export const franchiseSectionMeta = {
  dashboard: {
    title: "Dashboard",
    description: "Overview of your franchise, live links, and key stats.",
  },
  "team-registration": {
    title: "Team Registration",
    description: "Create or edit the franchise details and linked teams.",
  },
  "player-registration": {
    title: "Player Registration",
    description: "Manage the player roster for your active franchise teams.",
  },
  "player-information": {
    title: "Player Information",
    description: "Review the players assigned under your franchise teams.",
  },
  teams: {
    title: "Teams",
    description: "Review the teams linked to your franchise.",
  },
  "team-performance": {
    title: "Team Performance",
    description: "Track squad balance, budget, and performance trends.",
  },
  "match-reports": {
    title: "Match Reports",
    description: "Check fixtures, notices, and recent franchise updates.",
  },
};

export function normalizeFranchiseSection(sectionKey = "") {
  return Object.prototype.hasOwnProperty.call(franchiseSectionMeta, sectionKey)
    ? sectionKey
    : DEFAULT_FRANCHISE_SECTION;
}
