const { getProjectData, listCollection } = require("./db");

const ROLE_LABELS = {
  super_admin: "Super Admin",
  ops_manager: "Ops Manager",
  franchise_admin: "Franchise Admin",
  scorer: "Scorer",
  finance_admin: "Finance Admin",
  fan_user: "Fan User",
};

const ROLE_SUMMARIES = {
  super_admin: "League control and governance",
  ops_manager: "Match operations and logistics",
  franchise_admin: "Franchise operations",
  scorer: "Live scoring control",
  finance_admin: "Finance and settlements",
  fan_user: "Fan access",
};

const ROLE_ALLOWED_PATHS = {
  super_admin: [
    "/admin",
    "/admin/analytics",
    "/admin/franchises",
    "/admin/matches",
    "/admin/players",
    "/admin/teams",
    "/admin/auction",
    "/admin/live-match",
    "/admin/finance",
    "/admin/approvals",
    "/franchise",
  ],
  ops_manager: ["/admin/matches", "/admin/live-match"],
  scorer: ["/admin/live-match"],
  finance_admin: ["/admin/finance"],
  franchise_admin: ["/franchise"],
};

function getInitials(name = "") {
  const tokens = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "SP";
  }

  return tokens.map((token) => token[0]?.toUpperCase() || "").join("");
}

function getRoleLabel(role = "") {
  return ROLE_LABELS[role] || "User";
}

function formatTimeAgo(timestamp) {
  const time = Number(timestamp || 0);

  if (!time) {
    return "Recently";
  }

  const diffMs = Math.max(Date.now() - time, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function createNotification(id, title, detail, time, unread = true, path = "") {
  return {
    id,
    title,
    detail,
    time,
    unread,
    path,
  };
}

function isPathAllowedForRole(role = "", targetPath = "") {
  if (!targetPath) {
    return true;
  }

  const allowedPaths = ROLE_ALLOWED_PATHS[role] || [];
  return allowedPaths.some(
    (allowedPath) =>
      targetPath === allowedPath || targetPath.startsWith(`${allowedPath}/`)
  );
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function includesContext(value, contextTerms) {
  const haystack = normalizeText(value);

  if (!haystack) {
    return false;
  }

  return contextTerms.some((term) => haystack.includes(term));
}

function resolveFranchiseScope(user, teams, franchises) {
  if (user?.role !== "franchise_admin") {
    return {
      teams,
      franchises,
      contextTerms: [],
      teamIds: new Set(),
      franchiseId: null,
    };
  }

  const franchiseId = String(user?.franchiseId || "");
  const scopedFranchises = franchises.filter(
    (franchise) => String(franchise.id || "") === franchiseId
  );
  const scopedTeams = teams.filter(
    (team) => String(team.franchise_id || "") === franchiseId
  );
  const contextTerms = [
    ...scopedFranchises.map((franchise) => franchise.company_name),
    ...scopedTeams.map((team) => team.team_name),
    ...scopedTeams.map((team) => team.venue),
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return {
    teams: scopedTeams,
    franchises: scopedFranchises,
    contextTerms,
    teamIds: new Set(scopedTeams.map((team) => String(team.id || ""))),
    franchiseId,
  };
}

function buildNotifications({
  approvals,
  invoices,
  auctions,
  matches,
  liveMatch,
}) {
  const notifications = [];
  const pendingApprovals = approvals.filter(
    (approval) => String(approval.status || "").toLowerCase() === "pending"
  );
  const escalatedApprovals = approvals.filter(
    (approval) => String(approval.status || "").toLowerCase() === "escalated"
  );
  const overdueInvoices = invoices.filter(
    (invoice) => String(invoice.status || "").toLowerCase() === "overdue"
  );
  const pendingLots = auctions.filter(
    (lot) => String(lot.status || "").toLowerCase() === "pending"
  );
  const liveFixtures = matches.filter(
    (match) => String(match.status || "").toLowerCase() === "live"
  );
  const nextFixture =
    matches.find(
      (match) =>
        String(match.status || "").toLowerCase() === "upcoming" ||
        String(match.status || "").toLowerCase() === "draft"
    ) || null;

  if (liveFixtures.length > 0 || Number(liveMatch?.updatedAt || 0) > 0) {
    notifications.push(
      createNotification(
        "live-match-sync",
        "Live match feed is active",
        liveMatch?.matchTitle
          ? `${liveMatch.matchTitle} is syncing from the scorer controls.`
          : `${liveFixtures.length} live fixture${liveFixtures.length === 1 ? "" : "s"} are active right now.`,
        formatTimeAgo(liveMatch?.updatedAt),
        true,
        "/admin/live-match"
      )
    );
  }

  if (pendingApprovals.length > 0 || escalatedApprovals.length > 0) {
    notifications.push(
      createNotification(
        "approval-queue",
        "Approval queue needs attention",
        `${pluralize(pendingApprovals.length, "pending request")} and ${pluralize(escalatedApprovals.length, "escalated request")} are waiting.`,
        pendingApprovals[0]?.date || "Today",
        true,
        "/admin/approvals"
      )
    );
  }

  if (overdueInvoices.length > 0) {
    notifications.push(
      createNotification(
        "overdue-invoices",
        "Overdue invoices detected",
        `${pluralize(overdueInvoices.length, "invoice")} ${overdueInvoices.length === 1 ? "needs" : "need"} finance follow-up immediately.`,
        overdueInvoices[0]?.due_date || "Today",
        true,
        "/admin/finance"
      )
    );
  }

  if (pendingLots.length > 0) {
    notifications.push(
      createNotification(
        "pending-auctions",
        "Auction lots are still pending",
        `${pluralize(pendingLots.length, "auction lot")} ${pendingLots.length === 1 ? "is" : "are"} waiting for the next bid decision.`,
        "Auction window",
        true,
        "/admin/auction"
      )
    );
  }

  if (nextFixture) {
    notifications.push(
      createNotification(
        "next-fixture",
        "Next fixture is lined up",
        `${nextFixture.teamA} vs ${nextFixture.teamB} is scheduled at ${nextFixture.venue}.`,
        nextFixture.date || "Upcoming",
        false,
        "/admin/matches"
      )
    );
  }

  if (notifications.length === 0) {
    notifications.push(
      createNotification(
        "system-healthy",
        "League operations are clear",
        "No urgent admin alerts are active right now.",
        "Live status",
        false,
        ""
      )
    );
  }

  return notifications.slice(0, 5);
}

async function resolveProfileContext(user) {
  if (user?.franchiseId == null) {
    return ROLE_SUMMARIES[user?.role] || user?.email || "League dashboard";
  }

  const [teams, franchises] = await Promise.all([
    listCollection("teams"),
    listCollection("franchises"),
  ]);
  const matchingTeam = teams.find(
    (team) => String(team.franchise_id || "") === String(user.franchiseId)
  );
  const matchingFranchise = franchises.find(
    (franchise) => String(franchise.id) === String(user.franchiseId)
  );

  return (
    matchingTeam?.team_name ||
    matchingFranchise?.company_name ||
    ROLE_SUMMARIES[user?.role] ||
    user?.email ||
    "League dashboard"
  );
}

async function getAdminShellPayload(user) {
  const [
    matches,
    players,
    teams,
    franchises,
    approvals,
    invoices,
    auctions,
    liveMatch,
    contextLabel,
  ] = await Promise.all([
    listCollection("matches"),
    listCollection("players"),
    listCollection("teams"),
    listCollection("franchises"),
    listCollection("approvals"),
    listCollection("invoices"),
    listCollection("auctions"),
    getProjectData("live-match"),
    resolveProfileContext(user),
  ]);

  const franchiseScope = resolveFranchiseScope(user, teams, franchises);
  const scopedMatches =
    user?.role === "franchise_admin"
      ? matches.filter((match) =>
          franchiseScope.contextTerms.some((term) =>
            [match.teamA, match.teamB, match.venue]
              .map((value) => normalizeText(value))
              .includes(term)
          )
        )
      : matches;
  const scopedPlayers =
    user?.role === "franchise_admin"
      ? players.filter((player) =>
          franchiseScope.teamIds.has(String(player.team_id || ""))
        )
      : players;
  const scopedApprovals =
    user?.role === "franchise_admin"
      ? approvals.filter(
          (approval) =>
            includesContext(approval.requested_by, franchiseScope.contextTerms) ||
            includesContext(approval.subject, franchiseScope.contextTerms) ||
            includesContext(approval.notes, franchiseScope.contextTerms)
        )
      : approvals;
  const scopedInvoices =
    user?.role === "franchise_admin"
      ? invoices.filter(
          (invoice) =>
            includesContext(invoice.party, franchiseScope.contextTerms) ||
            includesContext(invoice.category, franchiseScope.contextTerms) ||
            includesContext(invoice.notes, franchiseScope.contextTerms)
        )
      : invoices;
  const scopedAuctions =
    user?.role === "franchise_admin"
      ? auctions.filter(
          (lot) =>
            franchiseScope.teamIds.has(String(lot.team_id || "")) ||
            includesContext(lot.team_name, franchiseScope.contextTerms) ||
            includesContext(lot.player_name, franchiseScope.contextTerms)
        )
      : auctions;
  const liveMatchTitle = `${liveMatch?.matchTitle || ""} ${liveMatch?.venue || ""}`;
  const scopedLiveMatch =
    user?.role === "franchise_admin" &&
    !includesContext(liveMatchTitle, franchiseScope.contextTerms)
      ? null
      : liveMatch;

  const liveMatchesCount = scopedMatches.filter(
    (match) => String(match.status || "").toLowerCase() === "live"
  ).length;
  const pendingApprovalsCount = scopedApprovals.filter(
    (approval) => String(approval.status || "").toLowerCase() === "pending"
  ).length;
  const franchiseTeamsCount =
    user?.role === "franchise_admin"
      ? franchiseScope.teams.length
      : teams.filter(
          (team) =>
            String(team.franchise_id || "") === String(user?.franchiseId || "")
        ).length;

  const rawBadges = {
    "/franchise":
      user?.role === "franchise_admin" ? String(franchiseTeamsCount) : null,
    "/admin/matches": String(scopedMatches.length),
    "/admin/players": String(scopedPlayers.length),
    "/admin/franchises": String(franchises.length),
    "/admin/approvals": String(pendingApprovalsCount),
    "/admin/live-match": liveMatchesCount > 0 ? "LIVE" : null,
  };
  const visibleBadges = Object.fromEntries(
    Object.entries(rawBadges).filter(([badgePath]) =>
      isPathAllowedForRole(user?.role, badgePath)
    )
  );
  const visibleNotifications = buildNotifications({
    approvals: scopedApprovals,
    invoices: scopedInvoices,
    auctions: scopedAuctions,
    matches: scopedMatches,
    liveMatch: scopedLiveMatch,
  }).filter((notification) => isPathAllowedForRole(user?.role, notification.path));

  return {
    profile: {
      fullName: user?.fullName || user?.email || "Admin User",
      contextLabel,
      roleLabel: getRoleLabel(user?.role),
      status: user?.status || "Active",
      initials: getInitials(user?.fullName || user?.email),
      email: user?.email || "",
    },
    badges: visibleBadges,
    notifications: visibleNotifications,
  };
}

module.exports = {
  getAdminShellPayload,
};
