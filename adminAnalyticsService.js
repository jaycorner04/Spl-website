const { listCollection } = require("./db");

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function safeNumber(value) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatLakhs(amount, digits = 1) {
  const lakhs = safeNumber(amount) / 100000;
  return `Rs ${lakhs.toFixed(digits).replace(/\.0$/, "")}L`;
}

function groupTotals(records, keySelector, valueSelector = () => 1) {
  const totals = new Map();

  for (const record of records) {
    const key = keySelector(record);
    if (!key) {
      continue;
    }

    totals.set(key, (totals.get(key) || 0) + valueSelector(record));
  }

  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

function sortByValueDescending(rows) {
  return [...rows].sort((left, right) => right.value - left.value);
}

function buildKpis({
  teams,
  players,
  matches,
  performances,
  approvals,
  invoices,
}) {
  const totalRuns = performances.reduce(
    (sum, record) => sum + safeNumber(record.runs),
    0
  );
  const totalWickets = performances.reduce(
    (sum, record) => sum + safeNumber(record.wickets),
    0
  );
  const completedMatches = matches.filter(
    (match) => normalizeStatus(match.status) === "completed"
  ).length;
  const activeTeams = teams.filter(
    (team) => normalizeStatus(team.status) === "active"
  ).length;
  const pendingApprovals = approvals.filter((approval) =>
    ["pending", "escalated"].includes(normalizeStatus(approval.status))
  ).length;
  const incomeInvoices = invoices.filter(
    (invoice) => normalizeStatus(invoice.flow) === "income"
  );
  const totalIncome = incomeInvoices.reduce(
    (sum, invoice) => sum + safeNumber(invoice.amount),
    0
  );

  return [
    {
      label: "League Runs",
      value: totalRuns.toLocaleString("en-IN"),
      subtext: `${players.length} players contributing this season`,
      color: "blue",
      icon: "Runs",
    },
    {
      label: "League Wickets",
      value: totalWickets.toLocaleString("en-IN"),
      subtext: "Captured from live performance records",
      color: "green",
      icon: "Wkts",
    },
    {
      label: "Completed Matches",
      value: String(completedMatches),
      subtext: `${matches.length} fixtures currently tracked`,
      color: "purple",
      icon: "Fix",
    },
    {
      label: "Active Teams",
      value: String(activeTeams),
      subtext: `${pendingApprovals} approvals still need action`,
      color: "gold",
      icon: "Team",
    },
    {
      label: "Revenue Tracked",
      value: formatLakhs(totalIncome),
      subtext: `${incomeInvoices.length} income invoices recorded`,
      color: "orange",
      icon: "Rev",
    },
  ];
}

function buildRunsByTeam(performances) {
  return sortByValueDescending(
    groupTotals(
      performances,
      (record) => record.team_name,
      (record) => safeNumber(record.runs)
    )
  )
    .slice(0, 7)
    .map((row) => ({
      name: row.name,
      runs: row.value,
    }));
}

function buildRoleDistribution(players) {
  return sortByValueDescending(
    groupTotals(players, (player) => player.role || "Unknown")
  ).map((row) => ({
    name: row.name,
    value: row.value,
  }));
}

function buildBudgetByTeam(teams) {
  return [...teams]
    .map((team) => ({
      name: team.team_name || "Team",
      amount: safeNumber(team.budget_left),
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 8);
}

function buildMatchStatusOverview(matches) {
  const orderedStatuses = ["Upcoming", "Live", "Completed", "Draft"];
  const totalsByStatus = new Map(
    orderedStatuses.map((status) => [status, 0])
  );

  for (const match of matches) {
    const normalizedStatus = normalizeStatus(match.status);
    const matchedStatus =
      orderedStatuses.find(
        (status) => normalizeStatus(status) === normalizedStatus
      ) || match.status || "Unknown";

    totalsByStatus.set(matchedStatus, (totalsByStatus.get(matchedStatus) || 0) + 1);
  }

  return [...totalsByStatus.entries()].map(([name, value]) => ({
    name,
    fans: value,
  }));
}

function buildInsights({
  teams,
  players,
  performances,
  approvals,
  invoices,
}) {
  const runLeaders = buildRunsByTeam(performances);
  const leadingTeam = runLeaders[0];
  const totalPlayers = players.length;
  const activeTeams = teams.filter(
    (team) => normalizeStatus(team.status) === "active"
  ).length;
  const escalatedApprovals = approvals.filter(
    (approval) => normalizeStatus(approval.status) === "escalated"
  ).length;
  const overdueInvoices = invoices.filter(
    (invoice) => normalizeStatus(invoice.status) === "overdue"
  );
  const highestBudgetTeam = buildBudgetByTeam(teams)[0];

  return [
    {
      tone: "blue",
      title: "Top scoring squad is visible",
      body: leadingTeam
        ? `${leadingTeam.name} currently lead the league with ${leadingTeam.runs.toLocaleString(
            "en-IN"
          )} recorded runs.`
        : "Team run totals will appear here once performance data is available.",
    },
    {
      tone: "emerald",
      title: "League participation is healthy",
      body: `${activeTeams} active teams and ${totalPlayers} registered players are now coming directly from the backend.`,
    },
    {
      tone: overdueInvoices.length > 0 || escalatedApprovals > 0 ? "yellow" : "blue",
      title: "Operations need attention",
      body:
        overdueInvoices.length > 0 || escalatedApprovals > 0
          ? `${overdueInvoices.length} overdue invoice(s) and ${escalatedApprovals} escalated approval(s) still need follow-up.`
          : "No overdue invoices or escalated approvals are open right now.",
    },
    {
      tone: "purple",
      title: "Budget headroom is visible",
      body: highestBudgetTeam
        ? `${highestBudgetTeam.name} currently retain the highest remaining team budget at ${formatLakhs(
            highestBudgetTeam.amount
          )}.`
        : "Budget distribution will appear here once team budgets are available.",
    },
  ];
}

async function getAdminAnalyticsPayload() {
  const [teams, players, matches, performances, approvals, invoices] =
    await Promise.all([
      listCollection("teams"),
      listCollection("players"),
      listCollection("matches"),
      listCollection("performances"),
      listCollection("approvals"),
      listCollection("invoices"),
    ]);

  return {
    kpis: buildKpis({
      teams,
      players,
      matches,
      performances,
      approvals,
      invoices,
    }),
    runsByTeam: buildRunsByTeam(performances),
    roleDistribution: buildRoleDistribution(players),
    budgetByTeam: buildBudgetByTeam(teams),
    matchStatusOverview: buildMatchStatusOverview(matches),
    insights: buildInsights({
      teams,
      players,
      performances,
      approvals,
      invoices,
    }),
  };
}

module.exports = {
  getAdminAnalyticsPayload,
};
