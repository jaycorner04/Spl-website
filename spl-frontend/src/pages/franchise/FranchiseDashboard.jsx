import DashboardPanel from "../../components/dashboard/DashboardPanel";
import StatCard from "../../components/dashboard/StatCard";
import Badge from "../../components/common/Badge";
import useFranchiseDashboard from "../../hooks/useFranchiseDashboard";
import useFranchiseRoster from "../../hooks/useFranchiseRoster";
import { getAuthUser } from "../../utils/authStorage";
import { getMediaUrl } from "../../utils/media";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";

function formatLakhs(amount, digits = 1) {
  const numericAmount = Number(amount || 0);
  const lakhs = numericAmount / 100000;
  return `Rs ${lakhs.toFixed(digits).replace(/\.0$/, "")}L`;
}

function getNoticeColor(type = "") {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType.includes("live")) {
    return "red";
  }

  if (normalizedType.includes("match")) {
    return "blue";
  }

  if (normalizedType.includes("finance")) {
    return "green";
  }

  if (normalizedType.includes("performance")) {
    return "gold";
  }

  return "purple";
}

function getBudgetBarColorClass(index) {
  const colors = [
    "bg-[#853953]",
    "bg-purple-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-yellow-500",
  ];

  return colors[index % colors.length];
}

function renderTeamMark(teamName, logoPath, primaryColor) {
  const brandReference = findTeamBrandReference(teamName);
  const logoUrl = getMediaUrl(logoPath || "");
  const fallbackColor = brandReference?.logoColor || getFallbackColor(primaryColor);

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${teamName} logo`}
          className="h-full w-full object-contain"
        />
      ) : brandReference?.brandIcon ? (
        <brandReference.brandIcon
          aria-label={`${teamName} logo`}
          className="h-full w-full"
          style={{ color: fallbackColor }}
        />
      ) : (
        <span className="font-condensed text-sm font-bold uppercase tracking-[0.14em] text-slate-700">
          {getShortName(teamName || "FR")}
        </span>
      )}
    </div>
  );
}

export default function FranchiseDashboard() {
  const authUser = getAuthUser();
  const franchiseId = Number(authUser?.franchiseId || 0);
  const dashboardEnabled = authUser?.role === "franchise_admin" ? franchiseId > 0 : true;
  const {
    summary,
    nextMatch,
    notices,
    squadSummary,
    budgetTrend,
    loading: dashboardLoading,
    error: dashboardError,
  } = useFranchiseDashboard(
    franchiseId > 0 ? { franchiseId } : {},
    { enabled: dashboardEnabled }
  );
  const {
    teams,
    totalPlayers,
    playingXiCount,
    reserveCount,
    loading: rosterLoading,
    error: rosterError,
  } = useFranchiseRoster(franchiseId, {
    enabled: dashboardEnabled && franchiseId > 0,
  });

  const context =
    summary?.context ||
    nextMatch?.context ||
    notices?.context ||
    squadSummary?.context ||
    budgetTrend?.context ||
    null;
  const summaryCards = Array.isArray(summary?.cards) ? summary.cards : [];
  const noticeItems = Array.isArray(notices?.items) ? notices.items : [];
  const squadItems = Array.isArray(squadSummary?.items) ? squadSummary.items : [];
  const budgetItems = Array.isArray(budgetTrend?.items) ? budgetTrend.items : [];
  const maxBudgetAmount = Math.max(
    ...budgetItems.map((item) => Number(item.amount || 0)),
    1
  );

  return (
    <div className="space-y-6 bg-white">
      {!dashboardEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          This franchise account is not linked to an active franchise yet.
        </div>
      ) : null}

      {dashboardError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {dashboardError}
        </div>
      ) : null}

      {rosterError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {rosterError}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryLoadingFallback(summaryCards, dashboardLoading).map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            color={item.color}
            icon={item.icon}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel title={summary?.heroTitle || "Franchise Dashboard"}>
          {dashboardLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Loading franchise overview...
            </div>
          ) : context ? (
            <div className="grid gap-4 md:grid-cols-[auto_1fr]">
              <div className="flex justify-center md:justify-start">
                {renderTeamMark(
                  context.teamName || context.franchiseName,
                  teams[0]?.logo || "",
                  teams[0]?.primary_color || ""
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-[#853953]">
                    Active Franchise
                  </p>
                  <h2 className="mt-2 font-heading text-3xl leading-none text-slate-900">
                    {context.franchiseName || "Assigned Franchise"}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Team:{" "}
                    <span className="font-semibold text-slate-900">
                      {context.teamName || "Not linked yet"}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {[context.city, context.venue].filter(Boolean).join(" | ") ||
                      "Venue details will appear here once linked."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Owner
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {context.ownerName || "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Website
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {context.website || "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No franchise dashboard data is available yet.
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title={nextMatch?.title || "Next Match"} bodyClassName="space-y-4">
          {dashboardLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Loading next match...
            </div>
          ) : nextMatch?.match ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-condensed text-base font-bold uppercase tracking-[0.14em] text-slate-900">
                    {nextMatch.match.fixture}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {nextMatch.match.venue}
                  </p>
                </div>
                <Badge
                  label={nextMatch.match.status || "Upcoming"}
                  color={
                    String(nextMatch.match.status || "").toLowerCase() === "live"
                      ? "red"
                      : "blue"
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Match Date
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {nextMatch.match.date || "TBD"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Match Time
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {nextMatch.match.time || "TBD"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                {nextMatch.match.note}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No next match details are available yet.
            </div>
          )}
        </DashboardPanel>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardPanel title={notices?.title || "Notices"} bodyClassName="space-y-3">
          {dashboardLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Loading notices...
            </div>
          ) : noticeItems.length > 0 ? (
            noticeItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{item.date}</p>
                  </div>
                  <Badge
                    label={item.type || "Notice"}
                    color={getNoticeColor(item.type)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No notices are available yet.
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title={squadSummary?.title || "Squad Summary"} bodyClassName="space-y-4">
          {dashboardLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Loading squad summary...
            </div>
          ) : squadItems.length > 0 ? (
            squadItems.map((item, index) => {
              const maxValue = Math.max(
                ...squadItems.map((entry) => Number(entry.value || 0)),
                1
              );
              const width = `${Math.max(
                (Number(item.value || 0) / maxValue) * 100,
                10
              )}%`;

              return (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${getBudgetBarColorClass(index)}`}
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              No squad summary is available yet.
            </div>
          )}
        </DashboardPanel>
      </section>

      <DashboardPanel title="My Teams & Players" bodyClassName="space-y-4">
        {rosterLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading team roster...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            No teams are linked to this franchise yet.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Linked Teams
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {teams.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Playing XI Players
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {playingXiCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Reserve Players
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {reserveCount}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-4">
                    {renderTeamMark(team.team_name, team.logo, team.primary_color)}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-condensed text-base font-bold uppercase tracking-[0.12em] text-slate-900">
                          {team.team_name}
                        </p>
                        <Badge label={team.status || "Active"} color="green" />
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {[team.city, team.venue].filter(Boolean).join(" | ") ||
                          "Team location details are not available yet."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          XI {team.playingXi.length}/11
                        </span>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                          Bench {team.reservePlayers.length}
                        </span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          Total {team.roster.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-blue-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-condensed text-xs uppercase tracking-[0.16em] text-blue-800">
                          Playing XI
                        </p>
                        <span className="text-xs font-semibold text-blue-700">
                          {team.playingXi.length}
                        </span>
                      </div>

                      <div
                        className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {team.playingXi.length > 0 ? (
                          team.playingXi.map((player, index) => (
                            <div
                              key={player.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {index + 1}. {player.full_name}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {player.role || "Player"} | {player.batting_style || "Right Hand"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                            No Playing XI players selected yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-purple-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-condensed text-xs uppercase tracking-[0.16em] text-purple-800">
                          Reserve Players
                        </p>
                        <span className="text-xs font-semibold text-purple-700">
                          {team.reservePlayers.length}
                        </span>
                      </div>

                      <div
                        className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {team.reservePlayers.length > 0 ? (
                          team.reservePlayers.map((player) => (
                            <div
                              key={player.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {player.full_name}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {player.role || "Player"} | {player.bowling_style || "Not listed"}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                            No reserve players added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Total squad tracked across all linked teams:{" "}
              <span className="font-semibold text-slate-900">{totalPlayers}</span>
            </div>
          </>
        )}
      </DashboardPanel>

      <DashboardPanel title={budgetTrend?.title || "Budget Trend"} bodyClassName="space-y-4">
        {dashboardLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading budget trend...
          </div>
        ) : budgetTrend ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Total Purse
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatLakhs(budgetTrend.totalPurse || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Spent
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatLakhs(budgetTrend.spent || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Remaining
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {formatLakhs(budgetTrend.remaining || 0)}
                </p>
              </div>
            </div>

            {budgetItems.length > 0 ? (
              <div className="space-y-4">
                {budgetItems.map((item, index) => {
                  const width = `${Math.max(
                    (Number(item.amount || 0) / maxBudgetAmount) * 100,
                    12
                  )}%`;

                  return (
                    <div key={`${item.name}-${index}`}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{item.name}</span>
                        <span className="font-semibold text-slate-900">
                          {formatLakhs(item.amount || 0)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${getBudgetBarColorClass(index)}`}
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No budget history is available yet.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No budget trend is available yet.
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}

function summaryLoadingFallback(summaryCards, dashboardLoading) {
  if (Array.isArray(summaryCards) && summaryCards.length > 0) {
    return summaryCards;
  }

  if (!dashboardLoading) {
    return [];
  }

  return [
    {
      label: "Squad Strength",
      value: "...",
      subtext: "Loading franchise metrics",
      color: "blue",
      icon: "Sq",
    },
    {
      label: "Available Budget",
      value: "...",
      subtext: "Loading franchise purse",
      color: "green",
      icon: "Rs",
    },
    {
      label: "Wins This Season",
      value: "...",
      subtext: "Loading results",
      color: "gold",
      icon: "Wn",
    },
    {
      label: "Pending Notices",
      value: "...",
      subtext: "Loading updates",
      color: "red",
      icon: "Nt",
    },
  ];
}
