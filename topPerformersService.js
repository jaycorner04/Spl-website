const { getProjectData, listCollection } = require("./db");

const TOP_PERFORMER_ACCENTS = [
  "from-yellow-500/35 via-orange-400/10 to-transparent",
  "from-cyan-500/35 via-sky-400/10 to-transparent",
  "from-emerald-500/35 via-teal-400/10 to-transparent",
  "from-rose-500/35 via-red-400/10 to-transparent",
  "from-violet-500/35 via-fuchsia-400/10 to-transparent",
];

const AVATAR_COLORS = ["gold", "blue", "green", "purple", "orange"];

function safeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function slugifyName(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDecimal(value, digits = 1) {
  return safeNumber(value).toFixed(digits).replace(/\.0+$/, "");
}

function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getRoleBadgeColor(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole.includes("all")) {
    return "orange";
  }

  if (normalizedRole.includes("bowl")) {
    return "blue";
  }

  if (normalizedRole.includes("wicket") || normalizedRole.includes("keeper")) {
    return "purple";
  }

  return "green";
}

function calculatePerformancePoints(record) {
  const runs = safeNumber(record.runs);
  const wickets = safeNumber(record.wickets);
  const catches = safeNumber(record.catches);
  const stumpings = safeNumber(record.stumpings);

  return Math.round(runs + wickets * 40 + catches * 10 + stumpings * 12);
}

function buildPerformerStats(player, performance) {
  const role = String(player?.role || performance?.role || "Player");
  const matches = String(safeNumber(performance.matches));
  const runs = safeNumber(performance.runs);
  const wickets = safeNumber(performance.wickets);
  const battingAverage = formatDecimal(performance.batting_average, 2);
  const strikeRate = formatDecimal(performance.strike_rate, 1);
  const economy = formatDecimal(performance.economy, 2);
  const fours = String(safeNumber(performance.fours));
  const sixes = String(safeNumber(performance.sixes));
  const catches = String(safeNumber(performance.catches));
  const stumpings = String(safeNumber(performance.stumpings));
  const bestBowling =
    String(performance.best_bowling || "").trim() ||
    `${safeNumber(performance.wickets)}/${Math.max(
      0,
      Math.round(safeNumber(performance.economy) * 4)
    )}`;
  const dotBallPercentage = `${Math.round(
    safeNumber(performance.dot_ball_percentage)
  )}`;
  const points = calculatePerformancePoints(performance);

  if (role.toLowerCase().includes("all")) {
    return {
      statLine: `${points} PTS`,
      statLabel: "Top All-Rounder",
      tableHeaders: ["M", "Runs", "Wkts", "SR", "Eco"],
      tableValues: [
        matches,
        String(runs),
        String(wickets),
        strikeRate,
        economy,
      ],
    };
  }

  if (role.toLowerCase().includes("bowl")) {
    return {
      statLine: bestBowling,
      statLabel: "Top Bowler",
      tableHeaders: ["M", "Wkts", "Eco", "BBI", "Dot%"],
      tableValues: [
        matches,
        String(wickets),
        economy,
        bestBowling,
        dotBallPercentage,
      ],
    };
  }

  if (
    role.toLowerCase().includes("wicket") ||
    role.toLowerCase().includes("keeper")
  ) {
    return {
      statLine: `${runs} RUNS`,
      statLabel: "Top Wicketkeeper",
      tableHeaders: ["M", "Runs", "Avg", "SR", "C/S"],
      tableValues: [
        matches,
        String(runs),
        battingAverage,
        strikeRate,
        `${catches}/${stumpings}`,
      ],
    };
  }

  return {
    statLine: `${runs} RUNS`,
    statLabel: "Top Batter",
    tableHeaders: ["M", "Runs", "Avg", "SR", "4/6"],
    tableValues: [
      matches,
      String(runs),
      battingAverage,
      strikeRate,
      `${fours}/${sixes}`,
    ],
  };
}

async function getTopPerformers(limit = 5) {
  const [players, performances, homeContent] = await Promise.all([
    listCollection("players"),
    listCollection("performances"),
    getProjectData("home"),
  ]);

  if (!Array.isArray(performances) || performances.length === 0) {
    return Array.isArray(homeContent?.topPerformers)
      ? homeContent.topPerformers.slice(0, limit)
      : [];
  }

  const playersById = new Map(
    players.map((player) => [Number(player.id), player])
  );

  return performances
    .map((performance) => {
      const player = playersById.get(Number(performance.player_id)) || {};
      const name =
        player.full_name || performance.player_name || "SPL Player";
      const role = player.role || "Player";
      const team = player.team_name || performance.team_name || "SPL Franchise";
      const points = calculatePerformancePoints(performance);
      const performerStats = buildPerformerStats(player, performance);

      return {
        playerId: Number(player.id || performance.player_id || 0),
        name,
        role,
        team,
        points,
        image: player.photo || "",
        href: player.id ? `/players/${player.id}` : "/players",
        playerKey: slugifyName(name),
        ...performerStats,
      };
    })
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return right.playerId - left.playerId;
    })
    .slice(0, limit)
    .map((performer, index) => ({
      ...performer,
      accent: TOP_PERFORMER_ACCENTS[index % TOP_PERFORMER_ACCENTS.length],
    }));
}

async function getCompactTopPerformers(limit = 5) {
  const performers = await getTopPerformers(limit);

  return performers.map((performer, index) => ({
    initials: getInitials(performer.name),
    name: performer.name,
    role: performer.role,
    roleColor: getRoleBadgeColor(performer.role),
    team: performer.team,
    points: performer.points,
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  }));
}

module.exports = {
  calculatePerformancePoints,
  getCompactTopPerformers,
  getTopPerformers,
};
