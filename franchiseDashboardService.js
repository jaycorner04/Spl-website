const { getProjectData, listCollection } = require("./db");
const { calculatePerformancePoints } = require("./topPerformersService");

const DEFAULT_DASHBOARD_CONTENT = {
  heroTitle: "Franchise Dashboard",
  sectionTitles: {
    nextMatch: "Next Match",
    notices: "Notices",
    squadSummary: "Squad Summary",
    budgetTrend: "Budget Trend (Rs Lakh)",
  },
  summaryCards: {
    squadStrength: "Squad Strength",
    availableBudget: "Available Budget",
    winsThisSeason: "Wins This Season",
    pendingNotices: "Pending Notices",
  },
};

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function safeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatLakhs(amount, digits = 1) {
  const lakhs = safeNumber(amount) / 100000;
  const formatted = lakhs.toFixed(digits).replace(/\.0$/, "");
  return `Rs ${formatted}L`;
}

function formatLakhsNumber(amount, digits = 1) {
  const lakhs = safeNumber(amount) / 100000;
  return Number(lakhs.toFixed(digits));
}

function formatDisplayDate(value) {
  if (!value) {
    return "Recently updated";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTrailingNumericId(value) {
  const match = String(value || "").match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function buildContext(team, franchise) {
  return {
    teamId: Number(team?.id || 0),
    teamName: team?.team_name || "",
    franchiseId: Number(franchise?.id || team?.franchise_id || 0),
    franchiseName: franchise?.company_name || team?.team_name || "",
    ownerName: franchise?.owner_name || team?.owner || "",
    city: team?.city || "",
    venue: team?.venue || "",
    status: team?.status || "",
    website: franchise?.website || "",
  };
}

function getDashboardContent(content) {
  return {
    heroTitle: content?.heroTitle || DEFAULT_DASHBOARD_CONTENT.heroTitle,
    sectionTitles: {
      ...DEFAULT_DASHBOARD_CONTENT.sectionTitles,
      ...(content?.sectionTitles || {}),
    },
    summaryCards: {
      ...DEFAULT_DASHBOARD_CONTENT.summaryCards,
      ...(content?.summaryCards || {}),
    },
  };
}

function resolveFranchiseContext({ user, searchParams, teams, franchises }) {
  const requestedFranchiseId = safeNumber(searchParams.get("franchiseId"));
  const requestedTeamId = safeNumber(searchParams.get("teamId"));
  const requestedTeamName = String(searchParams.get("team") || "")
    .trim()
    .toLowerCase();
  const explicitFranchiseId = safeNumber(user?.franchiseId);
  const inferredId =
    user?.role === "franchise_admin"
      ? getTrailingNumericId(user?.employeeId)
      : null;
  const hasScopedFranchiseContext =
    requestedFranchiseId > 0 || explicitFranchiseId > 0 || inferredId != null;

  let team =
    teams.find((entry) => Number(entry.id) === requestedTeamId) ||
    (requestedTeamName
      ? teams.find(
          (entry) =>
            String(entry.team_name || "").trim().toLowerCase() === requestedTeamName
        )
      : null) ||
    teams.find(
      (entry) =>
        requestedFranchiseId > 0 &&
        Number(entry.franchise_id) === requestedFranchiseId
    ) ||
    teams.find(
      (entry) =>
        explicitFranchiseId > 0 &&
        Number(entry.franchise_id) === explicitFranchiseId
    ) ||
    teams.find(
      (entry) =>
        inferredId != null &&
        (Number(entry.id) === inferredId ||
          Number(entry.franchise_id) === inferredId)
    ) ||
    (!hasScopedFranchiseContext
      ? [...teams].sort((left, right) => Number(left.id || 0) - Number(right.id || 0))[0]
      : null) ||
    null;

  let franchise =
    franchises.find((entry) => Number(entry.id) === requestedFranchiseId) ||
    franchises.find(
      (entry) =>
        explicitFranchiseId > 0 && Number(entry.id) === explicitFranchiseId
    ) ||
    franchises.find(
      (entry) =>
        inferredId != null && Number(entry.id) === inferredId
    ) ||
    franchises.find(
      (entry) => Number(entry.id) === Number(team?.franchise_id || 0)
    ) ||
    [...franchises].sort((left, right) => Number(left.id || 0) - Number(right.id || 0))[0] ||
    null;

  if (!team && franchise) {
    team =
      teams.find(
        (entry) => Number(entry.franchise_id) === Number(franchise.id)
      ) || null;
  }

  return {
    franchise,
    team,
    context: buildContext(team, franchise),
  };
}

function getTeamPlayers(players, team) {
  if (!team) {
    return [];
  }

  return players.filter(
    (player) =>
      Number(player.team_id) === Number(team.id) ||
      String(player.team_name || "").toLowerCase() ===
        String(team.team_name || "").toLowerCase()
  );
}

function getTeamPerformances(performances, team) {
  if (!team) {
    return [];
  }

  return performances.filter(
    (performance) =>
      Number(performance.team_id) === Number(team.id) ||
      String(performance.team_name || "").toLowerCase() ===
        String(team.team_name || "").toLowerCase()
  );
}

function getTeamMatches(matches, team) {
  if (!team) {
    return [];
  }

  const teamName = String(team.team_name || "").toLowerCase();

  return matches.filter((match) =>
    [match.teamA, match.teamB].some(
      (name) => String(name || "").toLowerCase() === teamName
    )
  );
}

function parseMatchTimestamp(match) {
  const rawValue = `${match?.date || ""} ${match?.time || ""}`.trim();

  if (!rawValue) {
    return null;
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.getTime();
}

function sortMatchesAscending(matches) {
  return [...matches].sort((left, right) => {
    const leftTimestamp = parseMatchTimestamp(left) || 0;
    const rightTimestamp = parseMatchTimestamp(right) || 0;
    return leftTimestamp - rightTimestamp;
  });
}

function sortMatchesDescending(matches) {
  return [...matches].sort((left, right) => {
    const leftTimestamp = parseMatchTimestamp(left) || 0;
    const rightTimestamp = parseMatchTimestamp(right) || 0;
    return rightTimestamp - leftTimestamp;
  });
}

function getWinningTeamName(match) {
  const result = String(match?.result || "").trim();

  if (!result) {
    return "";
  }

  const wonMatch = result.match(/^(.+?)\s+won\b/i);
  if (wonMatch) {
    return wonMatch[1].trim();
  }

  const beatMatch = result.match(/^(.+?)\s+beat\b/i);
  if (beatMatch) {
    return beatMatch[1].trim();
  }

  return "";
}

function getOpponentName(match, teamName) {
  return String(match?.teamA || "").toLowerCase() === String(teamName || "").toLowerCase()
    ? match?.teamB || ""
    : match?.teamA || "";
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole.includes("all")) {
    return "All-Rounders";
  }

  if (normalizedRole.includes("wicket") || normalizedRole.includes("keeper")) {
    return "Wicket Keepers";
  }

  if (normalizedRole.includes("bowl")) {
    return "Bowlers";
  }

  return "Batsmen";
}

function buildSummaryCards({
  team,
  franchise,
  teamPlayers,
  notices,
  teamMatches,
  labels,
}) {
  const activePlayers = teamPlayers.filter(
    (player) => normalizeStatus(player.status) === "active"
  ).length;
  const completedMatches = teamMatches.filter(
    (match) => normalizeStatus(match.status) === "completed"
  );
  const wins = completedMatches.filter(
    (match) =>
      getWinningTeamName(match).toLowerCase() ===
      String(team?.team_name || "").toLowerCase()
  ).length;

  return [
    {
      label: labels.squadStrength,
      value: `${teamPlayers.length}/15`,
      subtext: `${activePlayers} active players registered`,
      color: "blue",
      icon: "Sq",
    },
    {
      label: labels.availableBudget,
      value: formatLakhs(team?.budget_left || 0),
      subtext: `${franchise?.company_name || team?.team_name || "Franchise"} purse remaining`,
      color: "green",
      icon: "Rs",
    },
    {
      label: labels.winsThisSeason,
      value: String(wins),
      subtext: `${completedMatches.length} completed matches tracked`,
      color: "gold",
      icon: "Wn",
    },
    {
      label: labels.pendingNotices,
      value: String(notices.length),
      subtext: `${team?.status || "Active"} franchise updates`,
      color: "red",
      icon: "Nt",
    },
  ];
}

function buildNextMatchPayload(teamMatches, team) {
  const liveMatches = sortMatchesAscending(
    teamMatches.filter((match) => normalizeStatus(match.status) === "live")
  );
  const upcomingMatches = sortMatchesAscending(
    teamMatches.filter((match) => normalizeStatus(match.status) === "upcoming")
  );
  const selectedMatch = liveMatches[0] || upcomingMatches[0] || null;

  if (!selectedMatch) {
    return {
      fixture: `${team?.team_name || "Franchise"} schedule pending`,
      venue: team?.venue || "Venue to be announced",
      date: "TBD",
      time: "TBD",
      note: "No upcoming fixture is available for this franchise yet.",
      status: "Idle",
    };
  }

  const opponent = getOpponentName(selectedMatch, team?.team_name || "");
  const isLive = normalizeStatus(selectedMatch.status) === "live";

  return {
    fixture: `${team?.team_name || "Franchise"} vs ${opponent}`,
    venue: selectedMatch.venue || team?.venue || "Venue to be announced",
    date: selectedMatch.date || "TBD",
    time: selectedMatch.time || "TBD",
    note: isLive
      ? `Live scoring is active against ${opponent}.`
      : `Next opponent is ${opponent}. Playing XI lock is due before match start.`,
    status: selectedMatch.status || "Upcoming",
  };
}

function buildTeamNotices({ team, teamPlayers, teamPerformances, nextMatch, budgetLeft }) {
  const notices = [];
  const activePlayers = teamPlayers.filter(
    (player) => normalizeStatus(player.status) === "active"
  );
  const reviewPlayers = teamPlayers.filter(
    (player) => normalizeStatus(player.status) !== "active"
  );
  const topPerformer = [...teamPerformances]
    .map((performance) => ({
      ...performance,
      points: calculatePerformancePoints(performance),
    }))
    .sort((left, right) => right.points - left.points)[0];

  notices.push({
    id: `fixture-${team?.id || 0}`,
    title:
      nextMatch.status === "Idle"
        ? `Fixture allocation is pending for ${team?.team_name || "this franchise"}`
        : `${nextMatch.fixture} scheduled at ${nextMatch.venue}`,
    type: nextMatch.status === "Live" ? "Live" : "Matchday",
    date:
      nextMatch.status === "Idle"
        ? "Schedule pending"
        : `${nextMatch.date} - ${nextMatch.time}`,
  });

  notices.push({
    id: `squad-${team?.id || 0}`,
    title:
      reviewPlayers.length > 0
        ? `${reviewPlayers.length} squad profile(s) need status review`
        : `${activePlayers.length} active players are ready for selection`,
    type: "Squad",
    date: `${activePlayers.length}/15 registered`,
  });

  if (topPerformer) {
    notices.push({
      id: `performance-${topPerformer.id}`,
      title: `${topPerformer.player_name} leads ${team?.team_name || "the franchise"} with ${topPerformer.points} points`,
      type: "Performance",
      date: formatDisplayDate(topPerformer.updated_at),
    });
  }

  notices.push({
    id: `finance-${team?.id || 0}`,
    title: `${formatLakhs(budgetLeft)} is currently available in the franchise purse`,
    type: "Finance",
    date: team?.status || "Active",
  });

  return notices;
}

function buildSquadSummary(teamPlayers) {
  const buckets = {
    Batsmen: 0,
    Bowlers: 0,
    "All-Rounders": 0,
    "Wicket Keepers": 0,
  };

  teamPlayers.forEach((player) => {
    const bucketName = normalizeRole(player.role);
    buckets[bucketName] += 1;
  });

  return Object.entries(buckets).map(([name, value]) => ({
    name,
    value,
  }));
}

function buildBudgetTrend(teamPlayers, budgetLeft) {
  const sortedPlayers = [...teamPlayers].sort((left, right) => {
    const leftTimestamp = new Date(left.created_at || 0).getTime() || 0;
    const rightTimestamp = new Date(right.created_at || 0).getTime() || 0;
    return leftTimestamp - rightTimestamp;
  });
  const totalSpent = sortedPlayers.reduce(
    (sum, player) => sum + safeNumber(player.salary),
    0
  );
  const totalPurse = safeNumber(budgetLeft) + totalSpent;

  if (sortedPlayers.length === 0) {
    return {
      items: [{ name: "Week 1", amount: formatLakhsNumber(totalPurse) }],
      totalPurse: formatLakhsNumber(totalPurse),
      spent: formatLakhsNumber(totalSpent),
      remaining: formatLakhsNumber(budgetLeft),
    };
  }

  const bucketCount = Math.min(5, sortedPlayers.length);
  const chunkSize = Math.ceil(sortedPlayers.length / bucketCount);
  const items = [];
  let cumulativeSpent = 0;

  for (let index = 0; index < bucketCount; index += 1) {
    const start = index * chunkSize;
    const end = start + chunkSize;
    const chunk = sortedPlayers.slice(start, end);

    if (chunk.length === 0) {
      continue;
    }

    cumulativeSpent += chunk.reduce(
      (sum, player) => sum + safeNumber(player.salary),
      0
    );

    items.push({
      name: `Week ${index + 1}`,
      amount: formatLakhsNumber(Math.max(totalPurse - cumulativeSpent, 0)),
    });
  }

  return {
    items,
    totalPurse: formatLakhsNumber(totalPurse),
    spent: formatLakhsNumber(totalSpent),
    remaining: formatLakhsNumber(budgetLeft),
  };
}

function filterSearchRecords(records, query, fields, limit) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return records
    .map((record) => {
      const haystacks = fields.map((field) =>
        String(record?.[field] || "").toLowerCase()
      );

      let score = 0;

      for (const haystack of haystacks) {
        if (!haystack) {
          continue;
        }

        if (haystack === normalizedQuery) {
          score = Math.max(score, 120);
        } else if (haystack.startsWith(normalizedQuery)) {
          score = Math.max(score, 90);
        } else if (haystack.includes(normalizedQuery)) {
          score = Math.max(score, 60);
        }
      }

      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return Number(left.record?.id || 0) - Number(right.record?.id || 0);
    })
    .slice(0, limit)
    .map((item) => item.record);
}

function buildDetailRows(entries) {
  return entries.filter((entry) => String(entry?.value || "").trim());
}

function buildFranchiseSearchGroups({ context, team, franchise, teamPlayers, teamPerformances, teamMatches, query, limit }) {
  const groups = [];

  const matchedPlayers = filterSearchRecords(
    teamPlayers,
    query,
    [
      "full_name",
      "team_name",
      "role",
      "batting_style",
      "bowling_style",
      "email",
      "mobile",
      "status",
    ],
    limit
  );

  if (matchedPlayers.length > 0) {
    groups.push({
      key: "players",
      label: "Players",
      items: matchedPlayers.map((player) => ({
        id: player.id,
        path: "/franchise",
        title: player.full_name,
        subtitle: [player.team_name || context.teamName, player.role]
          .filter(Boolean)
          .join(" • "),
        meta: player.status || "Player",
        detail: {
          heading: player.full_name,
          eyebrow: "Player Search Result",
          accent: player.role || "Player",
          rows: buildDetailRows([
            { label: "Team", value: player.team_name || context.teamName },
            { label: "Role", value: player.role || "Player" },
            { label: "Status", value: player.status || "Active" },
            { label: "Batting", value: player.batting_style || "Right-hand Bat" },
            { label: "Bowling", value: player.bowling_style || "Not listed" },
            { label: "Email", value: player.email || "Not available" },
            { label: "Mobile", value: player.mobile || "Not available" },
          ]),
        },
      })),
    });
  }

  const matchedPerformances = filterSearchRecords(
    teamPerformances,
    query,
    ["player_name", "team_name", "best_bowling", "updated_at"],
    limit
  );

  if (matchedPerformances.length > 0) {
    groups.push({
      key: "performances",
      label: "Performances",
      items: matchedPerformances.map((performance) => ({
        id: performance.id,
        path: "/franchise",
        title: performance.player_name,
        subtitle: [
          performance.team_name || context.teamName,
          performance.matches != null ? `${performance.matches} matches` : "",
        ]
          .filter(Boolean)
          .join(" • "),
        meta:
          performance.runs > 0
            ? `${performance.runs} runs`
            : `${performance.wickets || 0} wickets`,
        detail: {
          heading: performance.player_name,
          eyebrow: "Performance Snapshot",
          accent: performance.team_name || context.teamName,
          rows: buildDetailRows([
            { label: "Matches", value: performance.matches },
            { label: "Runs", value: performance.runs },
            { label: "Wickets", value: performance.wickets },
            { label: "Avg", value: performance.batting_average },
            { label: "SR", value: performance.strike_rate },
            { label: "Eco", value: performance.economy },
            { label: "Best Bowling", value: performance.best_bowling || "N/A" },
          ]),
        },
      })),
    });
  }

  const matchedMatches = filterSearchRecords(
    teamMatches,
    query,
    ["teamA", "teamB", "venue", "status", "result", "umpire"],
    limit
  );

  if (matchedMatches.length > 0) {
    groups.push({
      key: "matches",
      label: "Matches",
      items: matchedMatches.map((match) => ({
        id: match.id,
        path: "/franchise",
        title: `${match.teamA} vs ${match.teamB}`,
        subtitle: [match.date, match.time, match.venue].filter(Boolean).join(" • "),
        meta: match.status || "Match",
        detail: {
          heading: `${match.teamA} vs ${match.teamB}`,
          eyebrow: "Match Detail",
          accent: match.status || "Match",
          rows: buildDetailRows([
            { label: "Venue", value: match.venue || context.venue },
            { label: "Date", value: match.date || "TBD" },
            { label: "Time", value: match.time || "TBD" },
            { label: "Status", value: match.status || "Upcoming" },
            { label: "Umpire", value: match.umpire || "To be confirmed" },
            { label: "Result", value: match.result || "Awaiting result" },
          ]),
        },
      })),
    });
  }

  const matchedTeams = filterSearchRecords(
    team ? [team] : [],
    query,
    ["team_name", "city", "coach", "venue", "status"],
    limit
  );

  if (matchedTeams.length > 0) {
    groups.push({
      key: "teams",
      label: "Team",
      items: matchedTeams.map((entry) => ({
        id: entry.id,
        path: "/franchise",
        title: entry.team_name,
        subtitle: [entry.city, entry.venue].filter(Boolean).join(" • "),
        meta: entry.status || "Team",
        detail: {
          heading: entry.team_name,
          eyebrow: "Team Detail",
          accent: entry.status || "Active",
          rows: buildDetailRows([
            { label: "City", value: entry.city || "Not listed" },
            { label: "Venue", value: entry.venue || "Not listed" },
            { label: "Coach", value: entry.coach || "Not listed" },
            { label: "Vice Coach", value: entry.vice_coach || "Not listed" },
            { label: "Budget Left", value: formatLakhs(entry.budget_left || 0) },
          ]),
        },
      })),
    });
  }

  const matchedFranchises = filterSearchRecords(
    franchise ? [franchise] : [],
    query,
    ["company_name", "owner_name", "address", "website"],
    limit
  );

  if (matchedFranchises.length > 0) {
    groups.push({
      key: "franchises",
      label: "Franchise",
      items: matchedFranchises.map((entry) => ({
        id: entry.id,
        path: "/franchise",
        title: entry.company_name,
        subtitle: [entry.owner_name, entry.website].filter(Boolean).join(" • "),
        meta: "Franchise",
        detail: {
          heading: entry.company_name,
          eyebrow: "Franchise Detail",
          accent: context.status || "Active",
          rows: buildDetailRows([
            { label: "Owner", value: entry.owner_name || "Not listed" },
            { label: "Website", value: entry.website || "Not listed" },
            { label: "Address", value: entry.address || "Not listed" },
            { label: "Team", value: context.teamName },
            { label: "Venue", value: context.venue || "Not listed" },
          ]),
        },
      })),
    });
  }

  return groups;
}

async function getFranchiseSearchPayload(options = {}) {
  const [franchises, teams, players, matches, performances] = await Promise.all([
    listCollection("franchises"),
    listCollection("teams"),
    listCollection("players"),
    listCollection("matches"),
    listCollection("performances"),
  ]);
  const searchParams = options.searchParams || new URLSearchParams();
  const query = String(
    searchParams.get("q") || searchParams.get("search") || ""
  ).trim();
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "", 10);
  const groupLimit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 8;

  const { team, franchise, context } = resolveFranchiseContext({
    user: options.user || null,
    searchParams,
    teams,
    franchises,
  });

  if (!team && !franchise) {
    return {
      query,
      total: 0,
      groups: [],
      context: null,
    };
  }

  if (query.length < 2) {
    return {
      query,
      total: 0,
      groups: [],
      context,
    };
  }

  const groups = buildFranchiseSearchGroups({
    context,
    team,
    franchise,
    teamPlayers: getTeamPlayers(players, team),
    teamPerformances: getTeamPerformances(performances, team),
    teamMatches: getTeamMatches(matches, team),
    query,
    limit: groupLimit,
  });
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return {
    query,
    total,
    context,
    groups,
  };
}

async function getFranchiseDashboardSection(section, options = {}) {
  const [franchises, teams, players, matches, performances, dashboardContent] =
    await Promise.all([
      listCollection("franchises"),
      listCollection("teams"),
      listCollection("players"),
      listCollection("matches"),
      listCollection("performances"),
      getProjectData("franchise-dashboard"),
    ]);
  const labels = getDashboardContent(dashboardContent);

  const searchParams = options.searchParams || new URLSearchParams();
  const { team, franchise, context } = resolveFranchiseContext({
    user: options.user || null,
    searchParams,
    teams,
    franchises,
  });

  if (!team && !franchise) {
    return null;
  }

  const teamPlayers = getTeamPlayers(players, team);
  const teamPerformances = getTeamPerformances(performances, team);
  const teamMatches = getTeamMatches(matches, team);
  const nextMatch = buildNextMatchPayload(teamMatches, team);
  const notices = buildTeamNotices({
    team,
    teamPlayers,
    teamPerformances,
    nextMatch,
    budgetLeft: team?.budget_left || 0,
  });
  const budgetTrend = buildBudgetTrend(teamPlayers, team?.budget_left || 0);

  const payload = {
    summary: {
      heroTitle: labels.heroTitle,
      context,
      cards: buildSummaryCards({
        team,
        franchise,
        teamPlayers,
        notices,
        teamMatches,
        labels: labels.summaryCards,
      }),
    },
    "next-match": {
      title: labels.sectionTitles.nextMatch,
      context,
      match: nextMatch,
    },
    notices: {
      title: labels.sectionTitles.notices,
      context,
      items: notices,
    },
    "squad-summary": {
      title: labels.sectionTitles.squadSummary,
      context,
      items: buildSquadSummary(teamPlayers),
    },
    "budget-trend": {
      title: labels.sectionTitles.budgetTrend,
      context,
      ...budgetTrend,
    },
  };

  return section ? payload[section] || null : payload;
}

module.exports = {
  getFranchiseDashboardSection,
  getFranchiseSearchPayload,
};

