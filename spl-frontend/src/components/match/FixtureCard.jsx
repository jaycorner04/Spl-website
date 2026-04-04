import RouteAction from "../common/RouteAction";

function buildTeamPlayersLink(teamId, teamName) {
  const params = new URLSearchParams();

  if (teamId != null && teamId !== "") {
    params.set("teamId", String(teamId));
  }

  if (teamName) {
    params.set("teamName", teamName);
  }

  return `/players?${params.toString()}`;
}

export default function FixtureCard({
  teamA,
  teamAId,
  teamB,
  teamBId,
  teamALogo: TeamALogo,
  teamAColor,
  teamBLogo: TeamBLogo,
  teamBColor,
  date,
  time,
  venue,
  status,
  teamAScore,
  teamBScore,
  result,
}) {
  const statusStyles = {
    Upcoming: "border-yellow-300 bg-yellow-50 text-yellow-600",
    Live: "border-red-300 bg-red-50 text-red-500",
    Completed: "border-emerald-300 bg-emerald-50 text-emerald-600",
  };

  const teamALink = buildTeamPlayersLink(teamAId, teamA);
  const teamBLink = buildTeamPlayersLink(teamBId, teamB);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] ${statusStyles[status]}`}
            >
              {status}
            </div>

            <div className="text-sm text-slate-500">
              {date} · {time}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="text-left">
              <RouteAction
                to={teamALink}
                aria-label={`Open ${teamA} players`}
                className="inline-block rounded-2xl outline-none transition-transform duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                    {TeamALogo ? (
                      <TeamALogo
                        className="h-7 w-7"
                        style={{ color: teamAColor || "#334155" }}
                        aria-label={`${teamA} logo`}
                      />
                    ) : null}
                  </div>
                </div>
                <h3 className="font-condensed text-[1.45rem] uppercase tracking-[0.12em] text-slate-900 transition-colors duration-300 hover:text-red-500 sm:text-2xl">
                  {teamA}
                </h3>
              </RouteAction>
              {teamAScore ? (
                <p className="mt-2 font-heading text-[1.9rem] text-yellow-500 sm:text-3xl">
                  {teamAScore}
                </p>
              ) : null}
              <RouteAction
                to={teamALink}
                className="mt-4 inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 font-condensed text-xs uppercase tracking-[0.16em] text-red-500 transition-colors duration-300 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-600"
              >
                Team Profile
              </RouteAction>
            </div>

            <div className="text-center">
              <span className="font-heading text-[1.9rem] text-slate-400 sm:text-3xl">VS</span>
            </div>

            <div className="text-left sm:text-right">
              <RouteAction
                to={teamBLink}
                aria-label={`Open ${teamB} players`}
                className="inline-block rounded-2xl outline-none transition-transform duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <div className="mb-3 flex items-center justify-start gap-3 sm:justify-end">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                    {TeamBLogo ? (
                      <TeamBLogo
                        className="h-7 w-7"
                        style={{ color: teamBColor || "#334155" }}
                        aria-label={`${teamB} logo`}
                      />
                    ) : null}
                  </div>
                </div>
                <h3 className="font-condensed text-[1.45rem] uppercase tracking-[0.12em] text-slate-900 transition-colors duration-300 hover:text-red-500 sm:text-2xl">
                  {teamB}
                </h3>
              </RouteAction>
              {teamBScore ? (
                <p className="mt-2 font-heading text-[1.9rem] text-yellow-500 sm:text-3xl">
                  {teamBScore}
                </p>
              ) : null}
              <RouteAction
                to={teamBLink}
                className="mt-4 inline-flex rounded-full border border-red-200 bg-red-50 px-4 py-2 font-condensed text-xs uppercase tracking-[0.16em] text-red-500 transition-colors duration-300 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-600"
              >
                Team Profile
              </RouteAction>
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-500">{venue}</p>

          {result ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {result}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
