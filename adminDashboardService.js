const { getProjectData, listCollection } = require("./db");
const { getCompactTopPerformers } = require("./topPerformersService");

const TEAM_COLOR_MAP = {
  blue: "#3b82f6",
  darkblue: "#1d4ed8",
  black: "#111827",
  red: "#ef4444",
  gold: "#f59e0b",
  yellow: "#eab308",
};

const FALLBACK_DOT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#0f172a",
];

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatLakhs(amount, digits = 1) {
  const lakhs = Number(amount || 0) / 100000;
  const formatted = lakhs.toFixed(digits).replace(/\.0$/, "");
  return `Rs ${formatted}L`;
}

function formatPercentage(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function clampPercent(value) {
  const numericValue = Number(value || 0);

  if (!Number.isFinite(numericValue)) {
    return "0%";
  }

  return `${Math.max(0, Math.min(100, Math.round(numericValue)))}%`;
}

function getTeamDotColor(teamRow, teamsByName, index) {
  const matchingTeam = teamsByName.get(String(teamRow.team || "").toLowerCase());
  const configuredColor = TEAM_COLOR_MAP[
    String(matchingTeam?.primary_color || "").toLowerCase()
  ];

  return configuredColor || FALLBACK_DOT_COLORS[index % FALLBACK_DOT_COLORS.length];
}

function parseMatchDate(match) {
  const rawDate = `${match?.date || ""} ${match?.time || ""}`.trim();

  if (!rawDate) {
    return null;
  }

  const parsedDate = new Date(rawDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function sortMatchesByDate(matches, direction = "asc") {
  return [...matches].sort((left, right) => {
    const leftTimestamp = parseMatchDate(left)?.getTime() || 0;
    const rightTimestamp = parseMatchDate(right)?.getTime() || 0;

    return direction === "desc"
      ? rightTimestamp - leftTimestamp
      : leftTimestamp - rightTimestamp;
  });
}

function formatRelativeTime(value) {
  const timestamp =
    typeof value === "number" ? value : new Date(value || 0).getTime();

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "recently";
  }

  const diffMs = Date.now() - timestamp;

  if (diffMs < 60 * 1000) {
    return "just now";
  }

  if (diffMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diffMs / (60 * 1000)))} min ago`;
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))} hr ago`;
  }

  return `${Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)))} day ago`;
}

function buildPointsTableRows(homeContent, teamsByName) {
  const sourceRows = Array.isArray(homeContent?.standings?.season)
    ? homeContent.standings.season
    : [];
  const normalizedRows = sourceRows.map((teamRow, index) => ({
    rank: Number(teamRow.pos || index + 1),
    team: teamRow.team,
    played: Number(teamRow.played || 0),
    won: Number(teamRow.won || 0),
    lost: Number(teamRow.lost || 0),
    nrr: String(teamRow.nrr || "0.000"),
    points: Number(teamRow.pts || 0),
    dot: getTeamDotColor(teamRow, teamsByName, index),
  }));
  const knownTeamNames = new Set(
    normalizedRows.map((teamRow) => String(teamRow.team || "").toLowerCase())
  );
  const appendedRows = [...teamsByName.values()]
    .filter(
      (team) => !knownTeamNames.has(String(team.team_name || "").toLowerCase())
    )
    .sort((left, right) =>
      String(left.team_name || "").localeCompare(String(right.team_name || ""))
    )
    .map((team, index) => {
      const rank = normalizedRows.length + index + 1;
      const teamRow = {
        pos: rank,
        team: team.team_name,
      };

      return {
        rank,
        team: team.team_name,
        played: 0,
        won: 0,
        lost: 0,
        nrr: "0.000",
        points: 0,
        dot: getTeamDotColor(teamRow, teamsByName, rank - 1),
      };
    });

  return [...normalizedRows, ...appendedRows].map((teamRow, index) => ({
    ...teamRow,
    rank: index + 1,
    dot: getTeamDotColor(
      { team: teamRow.team },
      teamsByName,
      index
    ),
  }));
}

function buildSeasonProgress({
  totalMatchesTracked,
  matchesPlayed,
  activeTeams,
  totalTeams,
  totalSalary,
  totalBudgetCapacity,
}) {
  const safeBudgetCapacity = Math.max(totalBudgetCapacity, 1);

  return [
    {
      label: "Matches Played",
      value: `${matchesPlayed} / ${totalMatchesTracked}`,
      width: clampPercent((matchesPlayed / Math.max(totalMatchesTracked, 1)) * 100),
      color: "blue",
    },
    {
      label: "Teams Activated",
      value: `${activeTeams} / ${totalTeams}`,
      width: clampPercent((activeTeams / Math.max(totalTeams, 1)) * 100),
      color: "green",
    },
    {
      label: "Budget Utilized",
      value: `${formatLakhs(totalSalary)} / ${formatLakhs(totalBudgetCapacity)}`,
      width: clampPercent((totalSalary / safeBudgetCapacity) * 100),
      color: "gold",
    },
  ];
}

function buildLiveNow(liveMatch) {
  if (!liveMatch?.matchTitle) {
    return null;
  }

  const overs = Number(liveMatch.overs || 0);
  const balls = Number(liveMatch.balls || 0);
  const ballsBowled = overs * 6 + balls;
  const totalInningsBalls = 20 * 6;
  const ballsRemaining = Math.max(totalInningsBalls - ballsBowled, 0);
  const target = Number(liveMatch.target || 0);
  const score = Number(liveMatch.score || 0);
  const runsNeeded = target > 0 ? Math.max(target - score, 0) : 0;
  const summary =
    target > 0
      ? `${liveMatch.battingTeam} need ${runsNeeded} off ${ballsRemaining} balls`
      : `${liveMatch.battingTeam} are ${score}/${liveMatch.wickets} after ${overs}.${balls}`;

  return {
    venue: liveMatch.venue || "Live venue",
    matchLabel: liveMatch.matchTitle,
    statusLabel: "Live",
    teamA: liveMatch.battingTeam,
    teamB: liveMatch.bowlingTeam,
    score: `${score}/${Number(liveMatch.wickets || 0)}`,
    overs: `${overs}.${balls} Ov`,
    summary,
    updatedAtLabel: formatRelativeTime(liveMatch.updatedAt),
  };
}

function buildRecentActivities({
  liveMatch,
  nextUpcomingMatch,
  latestCompletedMatch,
  pendingTeams,
  topPerformer,
}) {
  const activities = [];

  if (liveMatch?.matchTitle) {
    activities.push({
      icon: "LV",
      color: "red",
      text: `Live scoring active for ${liveMatch.matchTitle}`,
      time: `Updated ${formatRelativeTime(liveMatch.updatedAt)}`,
    });
  }

  if (nextUpcomingMatch) {
    activities.push({
      icon: "NX",
      color: "blue",
      text: `Next fixture: ${nextUpcomingMatch.teamA} vs ${nextUpcomingMatch.teamB}`,
      time: `${nextUpcomingMatch.date} at ${nextUpcomingMatch.time}`,
    });
  }

  if (latestCompletedMatch) {
    activities.push({
      icon: "OK",
      color: "green",
      text: latestCompletedMatch.result || `${latestCompletedMatch.teamA} vs ${latestCompletedMatch.teamB} completed`,
      time: `Completed on ${latestCompletedMatch.date}`,
    });
  }

  if (pendingTeams.length > 0) {
    const teamNames = pendingTeams
      .slice(0, 2)
      .map((team) => team.team_name)
      .join(", ");
    const extraCount = Math.max(pendingTeams.length - 2, 0);
    const summary = extraCount > 0 ? `${teamNames} + ${extraCount} more` : teamNames;

    activities.push({
      icon: "RV",
      color: "purple",
      text: `${pendingTeams.length} teams need status review`,
      time: summary,
    });
  }

  if (topPerformer) {
    activities.push({
      icon: "TP",
      color: "gold",
      text: `${topPerformer.name} leads the performer board`,
      time: `${topPerformer.points} points`,
    });
  }

  return activities.slice(0, 5);
}

function buildFranchiseOverviewRows(franchises, teams) {
  const linkedTeamsByFranchiseId = teams.reduce((accumulator, team) => {
    const franchiseId = String(team.franchise_id || "");

    if (!franchiseId) {
      return accumulator;
    }

    if (!accumulator[franchiseId]) {
      accumulator[franchiseId] = [];
    }

    accumulator[franchiseId].push(team);
    return accumulator;
  }, {});

  return [...franchises]
    .sort((left, right) =>
      String(left.company_name || "").localeCompare(String(right.company_name || ""))
    )
    .map((franchise) => {
      const linkedTeams = (linkedTeamsByFranchiseId[String(franchise.id)] || [])
        .slice()
        .sort((left, right) =>
          String(left.team_name || "").localeCompare(String(right.team_name || ""))
        );
      const featuredTeam = linkedTeams[0] || null;
      const resolvedLogo = franchise.logo || featuredTeam?.logo || "";
      const brandSourceName =
        featuredTeam?.team_name || franchise.company_name || "Unnamed Franchise";

      return {
        id: franchise.id,
        companyName: franchise.company_name || "Unnamed Franchise",
        ownerName: franchise.owner_name || "Owner not set",
        address: franchise.address || "",
        logo: resolvedLogo,
        brandSourceName,
        featuredTeamName: featuredTeam?.team_name || "",
        linkedTeamsCount: linkedTeams.length,
        teamCapacityLabel: `${linkedTeams.length}/3`,
        slotsLeft: Math.max(3 - linkedTeams.length, 0),
        ownershipStatus:
          linkedTeams.length >= 3
            ? "Full"
            : `${Math.max(3 - linkedTeams.length, 0)} Slot${
                Math.max(3 - linkedTeams.length, 0) === 1 ? "" : "s"
              } Left`,
        linkedTeamsLabel:
          linkedTeams.length > 0
            ? linkedTeams.map((team) => team.team_name).join(", ")
            : "No linked teams yet",
        website: franchise.website || "",
        hasLogo: Boolean(resolvedLogo),
      };
    });
}

async function buildAdminDashboardPayload() {
  const [
    teams,
    players,
    franchises,
    matches,
    approvals,
    invoices,
    homeContent,
    liveMatch,
    topPerformers,
  ] = await Promise.all([
    listCollection("teams"),
    listCollection("players"),
    listCollection("franchises"),
    listCollection("matches"),
    listCollection("approvals"),
    listCollection("invoices"),
    getProjectData("home"),
    getProjectData("live-match"),
    getCompactTopPerformers(),
  ]);

  const teamsByName = new Map(
    teams.map((team) => [String(team.team_name || "").toLowerCase(), team])
  );

  const activeTeams = teams.filter(
    (team) => normalizeStatus(team.status) === "active"
  ).length;
  const pendingTeams = teams.filter(
    (team) => normalizeStatus(team.status) !== "active"
  );
  const activePlayers = players.filter(
    (player) => normalizeStatus(player.status) === "active"
  ).length;
  const totalSalary = players.reduce(
    (sum, player) => sum + Number(player.salary || 0),
    0
  );
  const totalBudgetRemaining = teams.reduce(
    (sum, team) => sum + Number(team.budget_left || 0),
    0
  );
  const pendingApprovals = approvals.filter((approval) =>
    ["pending", "escalated"].includes(normalizeStatus(approval.status))
  );
  const overdueInvoices = invoices.filter(
    (invoice) => normalizeStatus(invoice.status) === "overdue"
  );
  const totalBudgetCapacity = totalSalary + totalBudgetRemaining;
  const liveMatches = liveMatch?.matchTitle ? 1 : 0;
  const linkedFranchiseIds = new Set(
    teams
      .map((team) => Number(team.franchise_id || 0))
      .filter((franchiseId) => franchiseId > 0)
  );
  const upcomingMatches = matches.filter((match) =>
    ["upcoming", "draft", "live"].includes(normalizeStatus(match.status))
  ).length;
  const completedMatchesList = sortMatchesByDate(
    matches.filter((match) => normalizeStatus(match.status) === "completed"),
    "desc"
  );
  const upcomingMatchesList = sortMatchesByDate(
    matches.filter((match) =>
      ["upcoming", "draft"].includes(normalizeStatus(match.status))
    )
  );
  const matchesPlayed = completedMatchesList.length + liveMatches;
  const totalMatchesTracked = matches.length + liveMatches;
  const pointsTableRows = buildPointsTableRows(homeContent, teamsByName);
  const budgetUtilization = totalBudgetCapacity
    ? (totalSalary / totalBudgetCapacity) * 100
    : 0;

  const stats = [
    {
      label: "Budget Utilized",
      value: formatPercentage(budgetUtilization),
      subtext: `${formatLakhs(totalSalary)} committed from ${formatLakhs(totalBudgetCapacity)}`,
      color: "gold",
      icon: "Rs",
    },
    {
      label: "Active Matches",
      value: String(upcomingMatches + liveMatches),
      subtext: `${liveMatches} live, ${upcomingMatches} scheduled`,
      color: "red",
      icon: "Fix",
    },
    {
      label: "Registered Players",
      value: String(players.length),
      subtext: `${activePlayers} active players in the pool`,
      color: "green",
      icon: "Ply",
    },
    {
      label: "Total Teams",
      value: String(teams.length),
      subtext: `${activeTeams} active, ${pendingTeams.length} under review`,
      color: "blue",
      icon: "Tm",
    },
    {
      label: "Total Franchises",
      value: String(franchises.length),
      subtext: `${linkedFranchiseIds.size} linked to active team records`,
      color: "purple",
      icon: "Fr",
    },
    {
      label: "Matches Played",
      value: String(matchesPlayed),
      subtext: `${completedMatchesList.length} completed and ${liveMatches} live`,
      color: "orange",
      icon: "Done",
    },
    {
      label: "Pending Approvals",
      value: String(pendingApprovals.length),
      subtext:
        pendingApprovals.length > 0 || overdueInvoices.length > 0
          ? `${pendingApprovals.length} approvals and ${overdueInvoices.length} overdue invoice(s)`
          : "Nothing waiting right now",
      color: "purple",
      icon: "Flag",
    },
  ];

  return {
    stats,
    pointsTableRows,
    seasonProgress: buildSeasonProgress({
      totalMatchesTracked,
      matchesPlayed,
      activeTeams,
      totalTeams: teams.length,
      totalSalary,
      totalBudgetCapacity,
    }),
    liveNow: buildLiveNow(liveMatch),
    franchiseOverview: buildFranchiseOverviewRows(franchises, teams),
    recentActivities: buildRecentActivities({
      liveMatch,
      nextUpcomingMatch: upcomingMatchesList[0] || null,
      latestCompletedMatch: completedMatchesList[0] || null,
      pendingTeams,
      topPerformer: topPerformers[0] || null,
    }),
    topPerformers,
  };
}

async function getAdminDashboardSection(section) {
  const payload = await buildAdminDashboardPayload();

  if (!section) {
    return payload;
  }

  const sectionMap = {
    stats: payload.stats,
    "points-table": payload.pointsTableRows,
    "season-progress": payload.seasonProgress,
    "live-now": payload.liveNow,
    franchises: payload.franchiseOverview,
    "recent-activity": payload.recentActivities,
    "top-performers": payload.topPerformers,
  };

  return sectionMap[section] ?? null;
}

module.exports = {
  buildAdminDashboardPayload,
  getAdminDashboardSection,
};
