import { useState } from "react";
import {
  SiFlipkart,
  SiHcl,
  SiInfosys,
  SiMahindra,
  SiPaytm,
  SiRelianceindustrieslimited,
  SiTata,
  SiTcs,
  SiWipro,
  SiZoho,
} from "react-icons/si";
import useTeams from "../../hooks/useTeams";
import { getMediaUrl } from "../../utils/media";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";
import useFranchises from "../../hooks/useFranchises";

const logoComponentMap = {
  flipkart: SiFlipkart,
  hcl: SiHcl,
  infosys: SiInfosys,
  mahindra: SiMahindra,
  paytm: SiPaytm,
  reliance: SiRelianceindustrieslimited,
  tata: SiTata,
  tcs: SiTcs,
  wipro: SiWipro,
  zoho: SiZoho,
};

function normalizeLogoKey(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveBrandIcon(logoKey, teamName) {
  const directKey = normalizeLogoKey(logoKey);
  const teamKey = normalizeLogoKey(teamName);

  return (
    logoComponentMap[directKey] ||
    logoComponentMap[teamKey] ||
    null
  );
}

function buildTeamIdentity(teamName, linkedTeam) {
  const brandReference = findTeamBrandReference(teamName);

  return {
    brandIcon:
      brandReference?.brandIcon ||
      linkedTeam?.brandIcon ||
      null,
    logoColor:
      brandReference?.logoColor ||
      getFallbackColor(linkedTeam?.primary_color) ||
      "#334155",
    logo: getMediaUrl(linkedTeam?.logo || ""),
    short: getShortName(teamName || linkedTeam?.team_name || "TM"),
  };
}

function mergeSeasonRows(rows, teams) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const teamsByName = new Map(
    (teams || []).map((team) => [String(team.team_name || "").toLowerCase(), team])
  );

  const normalizedRows = sourceRows.map((row, index) => {
    const teamName = row.team || "SPL Franchise";
    const linkedTeam = teamsByName.get(String(teamName).toLowerCase());
    const identity = buildTeamIdentity(teamName, linkedTeam);

    return {
      pos: Number(row.pos ?? index + 1),
      team: teamName,
      played: Number(row.played ?? 0),
      won: Number(row.won ?? 0),
      lost: Number(row.lost ?? 0),
      nrr: String(row.nrr ?? "0.000"),
      pts: Number(row.pts ?? 0),
      ...identity,
    };
  });

  const knownTeamNames = new Set(
    normalizedRows.map((row) => String(row.team || "").toLowerCase())
  );

  const appendedRows = (teams || [])
    .filter(
      (team) => !knownTeamNames.has(String(team.team_name || "").toLowerCase())
    )
    .sort((left, right) => String(left.team_name || "").localeCompare(String(right.team_name || "")))
    .map((team, index) => ({
      pos: normalizedRows.length + index + 1,
      team: team.team_name,
      played: 0,
      won: 0,
      lost: 0,
      nrr: "0.000",
      pts: 0,
      ...buildTeamIdentity(team.team_name, team),
    }));

  return [...normalizedRows, ...appendedRows].map((row, index) => ({
    ...row,
    pos: index + 1,
  }));
}

function normalizePlayoffRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return rows.map((row, index) => {
    const identity = {
      brandIcon: resolveBrandIcon(row.logoKey, row.team),
      logoColor: row.logoColor || "#334155",
      logo: "",
      short: getShortName(row.team || "TM"),
    };

    return {
      seed: row.seed || `P${index + 1}`,
      team: row.team || "SPL Franchise",
      stage: row.stage || "Playoff",
      opponent: row.opponent || "TBD",
      status: row.status || "Pending",
      ...identity,
    };
  });
}

function TeamMark({ row, sizeClass = "h-6 w-6", wrapperClass = "h-10 w-10" }) {
  const BrandIcon = row.brandIcon;

  return (
    <div className={`flex items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 ${wrapperClass}`}>
      {row.logo ? (
        <img
          src={row.logo}
          alt={`${row.team} logo`}
          loading="lazy"
          decoding="async"
          className={`${sizeClass} object-contain`}
        />
      ) : BrandIcon ? (
        <BrandIcon
          className={sizeClass}
          style={{ color: row.logoColor }}
          aria-label={`${row.team} logo`}
        />
      ) : (
        <span
          className="font-condensed text-xs font-bold uppercase tracking-[0.14em]"
          style={{ color: row.logoColor }}
        >
          {row.short}
        </span>
      )}
    </div>
  );
}

export default function PointsTableSection({
  standingsData,
  teams: prefetchedTeams = null,
  franchises: prefetchedFranchises = null,
}) {
  const [activeView, setActiveView] = useState("season");
  const useRemoteTeams = !Array.isArray(prefetchedTeams);
  const useRemoteFranchises = !Array.isArray(prefetchedFranchises);
  const { teams: loadedTeams } = useTeams({
    enabled: useRemoteTeams,
    initialData: prefetchedTeams || [],
  });
  const { franchises: loadedFranchises } = useFranchises({
    enabled: useRemoteFranchises,
    initialData: prefetchedFranchises || [],
  });
  const teams = Array.isArray(prefetchedTeams) ? prefetchedTeams : loadedTeams;
  const franchises = Array.isArray(prefetchedFranchises)
    ? prefetchedFranchises
    : loadedFranchises;
  const approvedFranchiseIds = new Set(
    (franchises || [])
      .filter((item) => {
        const normalizedStatus = String(item.status || "").trim().toLowerCase();
        return !normalizedStatus || normalizedStatus === "approved";
      })
      .map((item) => String(item.id))
  );
  const publicTeams = teams.filter((team) => {
    const franchiseId = String(team.franchise_id || "");
    return !franchiseId || approvedFranchiseIds.has(franchiseId);
  });
  const standings = mergeSeasonRows(standingsData?.season, publicTeams);
  const playoffStandings = normalizePlayoffRows(standingsData?.playoffs);
  const isPlayoffView = activeView === "playoffs";
  const displayedRows = isPlayoffView ? playoffStandings : standings;

  const getRankBadgeClass = (position) => {
    const badgeStyles = {
      1: "bg-yellow-400 text-black",
      2: "bg-slate-300 text-black",
      3: "bg-orange-500 text-white",
      4: "bg-sky-500 text-white",
      5: "bg-emerald-500 text-white",
      6: "bg-violet-500 text-white",
      7: "bg-pink-500 text-white",
      8: "bg-amber-600 text-white",
      9: "bg-rose-500 text-white",
      10: "bg-cyan-600 text-white",
    };

    return badgeStyles[position] || "border border-slate-200 bg-white text-slate-700";
  };

  const getRowAccent = (position) => {
    if (position === 1) return "bg-[linear-gradient(90deg,rgba(255,215,64,0.16),rgba(255,255,255,0))]";
    if (position <= 4) return "bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(255,255,255,0))]";
    return "";
  };

  return (
    <section className="spl-home-shell relative z-10 w-full py-12 sm:py-14">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-3xl tracking-[0.08em] text-[#5f2439] sm:text-4xl lg:text-[3rem]">
            POINTS <span className="text-[#b88a2a]">TABLE</span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveView("season")}
            className={`rounded-full border px-5 py-3 font-condensed text-sm uppercase tracking-[0.18em] ${
              !isPlayoffView
                ? "border-[#5f2439] bg-[#5f2439] text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Season 2026
          </button>
          <button
            type="button"
            onClick={() => setActiveView("playoffs")}
            className={`rounded-full border px-5 py-3 font-condensed text-sm uppercase tracking-[0.18em] ${
              isPlayoffView
                ? "border-[#5f2439] bg-[#5f2439] text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Playoffs
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f9fbff_0%,#fff7fa_100%)] px-5 py-5 sm:px-7">
          <div className="flex flex-wrap gap-3">
            {isPlayoffView ? (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eef8ff] px-3 py-1.5 text-xs font-medium text-[#0f6caa]">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Qualifier 1
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff2e8] px-3 py-1.5 text-xs font-medium text-[#c2410c]">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  Eliminator
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff7d6] px-3 py-1.5 text-xs font-medium text-[#8f6b10]">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  Table Leader
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eef8ff] px-3 py-1.5 text-xs font-medium text-[#0f6caa]">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  Playoff Zone
                </div>
              </>
            )}
          </div>
        </div>

        {displayedRows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            {isPlayoffView
              ? "Playoff standings will appear here once playoff matchups are published."
              : "Points table data will appear here once league standings are published."}
          </div>
        ) : (
          <>
            <div className="grid gap-4 p-4 sm:p-5 md:hidden">
              {isPlayoffView
                ? playoffStandings.map((row, index) => (
                <article
                  key={`${row.seed}-${row.team}-mobile`}
                  className={`rounded-[22px] border border-slate-200 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${
                    index < 2
                      ? "bg-[linear-gradient(135deg,rgba(56,189,248,0.10),white_65%)]"
                      : "bg-[linear-gradient(135deg,rgba(249,115,22,0.08),white_65%)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.18em] text-slate-700">
                        {row.seed}
                      </div>
                      <TeamMark row={row} />
                    </div>
                    <span className="inline-flex rounded-full bg-[#fff7d6] px-3 py-1.5 text-[11px] font-medium text-[#8f6b10]">
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-slate-900">{row.team}</h3>
                    <p className="mt-1 text-sm text-slate-500">{row.stage}</p>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Opponent
                    </div>
                    <div className="mt-1 font-medium text-slate-800">{row.opponent}</div>
                  </div>
                </article>
              ))
                : standings.map((row) => (
                <article
                  key={`${row.pos}-${row.team}-mobile`}
                  className={`rounded-[22px] border border-slate-200 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${getRowAccent(
                    row.pos
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full font-condensed text-sm ${getRankBadgeClass(
                          row.pos
                        )}`}
                      >
                        {row.pos}
                      </div>
                      <TeamMark row={row} />
                    </div>

                    <div className="text-right">
                      <div className="font-heading text-2xl leading-none text-[#b88a2a]">
                        {row.pts}
                      </div>
                      <div className="mt-1 font-condensed text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        Pts
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-slate-900">{row.team}</h3>
                    <p className="mt-1 text-sm text-slate-500">SPL Franchise</p>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">P</div>
                      <div className="mt-1 font-semibold text-slate-800">{row.played}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">W</div>
                      <div className="mt-1 font-semibold text-slate-800">{row.won}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">L</div>
                      <div className="mt-1 font-semibold text-slate-800">{row.lost}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">NRR</div>
                      <div
                        className={`mt-1 font-semibold ${
                          row.nrr.startsWith("+") ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {row.nrr}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse">
                <thead>
                  {isPlayoffView ? (
                    <tr className="border-b border-slate-200 bg-[#0f2447]">
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Seed</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Team</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Stage</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Opponent</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-[#f6cf63] sm:px-5 sm:text-sm">Status</th>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-200 bg-[#0f2447]">
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Pos</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">Team</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">P</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">W</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">L</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-white/75 sm:px-5 sm:text-sm">NRR</th>
                      <th className="px-4 py-4 text-left font-condensed text-xs uppercase tracking-[0.18em] text-[#f6cf63] sm:px-5 sm:text-sm">Pts</th>
                    </tr>
                  )}
                </thead>

                <tbody>
                  {isPlayoffView
                    ? playoffStandings.map((row, index) => (
                    <tr
                      key={`${row.seed}-${row.team}`}
                      className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                        index < 2
                          ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.10),rgba(255,255,255,0))]"
                          : "bg-[linear-gradient(90deg,rgba(249,115,22,0.08),rgba(255,255,255,0))]"
                      }`}
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 font-condensed text-xs uppercase tracking-[0.18em] text-slate-700">
                          {row.seed}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5 sm:text-base">
                        <div className="flex items-center gap-3">
                          <TeamMark row={row} wrapperClass="h-11 w-11" sizeClass="h-6 w-6 sm:h-7 sm:w-7" />
                          <div>
                            <div className="font-semibold text-slate-900">{row.team}</div>
                            <div className="font-condensed text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Qualified Team
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-5 sm:text-base">{row.stage}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-5 sm:text-base">{row.opponent}</td>
                      <td className="px-4 py-4 sm:px-5">
                        <span className="inline-flex rounded-full bg-[#fff7d6] px-3 py-1.5 text-xs font-medium text-[#8f6b10]">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                    : standings.map((row) => (
                    <tr
                      key={`${row.pos}-${row.team}`}
                      className={`border-b border-slate-100 transition hover:bg-slate-50 ${getRowAccent(row.pos)}`}
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full font-condensed text-sm ${getRankBadgeClass(
                            row.pos
                          )}`}
                        >
                          {row.pos}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-slate-900 sm:px-5 sm:text-base">
                        <div className="flex items-center gap-3">
                          <TeamMark row={row} wrapperClass="h-11 w-11" sizeClass="h-6 w-6 sm:h-7 sm:w-7" />
                          <div>
                            <div className="font-semibold text-slate-900">{row.team}</div>
                            <div className="font-condensed text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              SPL Franchise
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-5 sm:text-base">{row.played}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-5 sm:text-base">{row.won}</td>
                      <td className="px-4 py-4 text-sm text-slate-700 sm:px-5 sm:text-base">{row.lost}</td>
                      <td
                        className={`px-4 py-4 text-sm font-medium sm:px-5 sm:text-base ${
                          row.nrr.startsWith("+") ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {row.nrr}
                      </td>
                      <td className="px-4 py-4 font-heading text-xl text-[#b88a2a] sm:px-5 sm:text-2xl">
                        {row.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
