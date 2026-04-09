import { useMemo } from "react";
import SectionHeader from "../common/SectionHeader";
import RouteAction from "../common/RouteAction";
import { getMediaUrl } from "../../utils/media";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";

export default function FranchiseSection({
  franchises = [],
  teams = [],
  loading = false,
  error = "",
}) {
  const approvedFranchises = useMemo(
    () =>
      franchises.filter((item) => {
        const normalizedStatus = String(item.status || "").trim().toLowerCase();
        return !normalizedStatus || normalizedStatus === "approved";
      }),
    [franchises]
  );
  const allFranchiseIds = useMemo(
    () => new Set(franchises.map((item) => String(item.id))),
    [franchises]
  );

  const formattedFranchises = useMemo(() => {
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

    const franchiseCards = approvedFranchises.map((franchise) => {
      const linkedTeams = (linkedTeamsByFranchiseId[String(franchise.id)] || [])
        .slice()
        .sort((left, right) =>
          String(left.team_name || "").localeCompare(String(right.team_name || ""))
        );
      const featuredTeam = linkedTeams[0];
      const brandReference = findTeamBrandReference(
        featuredTeam?.team_name || franchise.company_name
      );

      return {
        id: `franchise-${franchise.id}`,
        route: `/teams?franchiseId=${franchise.id}`,
        short: getShortName(
          franchise.company_name || featuredTeam?.team_name || "FR"
        ),
        name: franchise.company_name || "Unnamed Franchise",
        city:
          franchise.address || featuredTeam?.city || "Location not available",
        owner:
          franchise.owner_name || featuredTeam?.owner || "Owner not available",
        logo: getMediaUrl(franchise.logo || featuredTeam?.logo || ""),
        brandIcon: brandReference?.brandIcon || null,
        logoColor:
          brandReference?.logoColor ||
          getFallbackColor(featuredTeam?.primary_color),
        linkedTeams: linkedTeams.map((team) => ({
          id: team.id,
          name: team.team_name || `Team ${team.id}`,
        })),
      };
    });

    const standaloneCards = teams
      .filter((team) => {
        const teamFranchiseId = String(team.franchise_id || "");

        return !teamFranchiseId || !allFranchiseIds.has(teamFranchiseId);
      })
      .sort((left, right) =>
        String(left.team_name || "").localeCompare(String(right.team_name || ""))
      )
      .map((team) => {
        const brandReference = findTeamBrandReference(team.team_name);

        return {
          id: `team-${team.id}`,
          route: `/teams/${team.id}`,
          short: getShortName(team.team_name || "TM"),
          name: team.team_name || "Independent Team",
          city: team.city || "Location not available",
          owner: team.owner || "Owner not available",
          logo: getMediaUrl(team.logo || ""),
          brandIcon: brandReference?.brandIcon || null,
          logoColor:
            brandReference?.logoColor || getFallbackColor(team.primary_color),
          linkedTeams: [{ id: team.id, name: team.team_name || `Team ${team.id}` }],
        };
      });

    return [...franchiseCards, ...standaloneCards];
  }, [allFranchiseIds, approvedFranchises, teams]);

  return (
    <section className="spl-home-shell relative z-10 w-full py-12 sm:py-14">
      <SectionHeader title="THE" highlight="FRANCHISES" darkMode={false} />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          Loading franchises...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          {error}
        </div>
      ) : formattedFranchises.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          No franchises found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-5">
          {formattedFranchises.map((franchise) => (
            <RouteAction
              key={franchise.id}
              to={franchise.route}
              className="group block h-full text-left"
            >
              <div className="relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-[10px] border border-white/10 bg-white text-center shadow-[0_12px_30px_rgba(15,23,42,0.10),0_0_0_1px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#9dd4ff] hover:bg-[#dff1ff] hover:shadow-[0_16px_38px_rgba(96,165,250,0.2)] md:min-h-[188px]">
                <div className="pointer-events-none absolute left-1/2 top-[33%] h-[88px] w-[185%] -translate-x-1/2 rounded-[50%] bg-[rgba(15,23,42,0.05)] transition-colors duration-300 group-hover:bg-[#cbe8ff] md:top-[34%] md:h-[108px] md:w-[180%]" />

                <div className="relative z-10 flex min-h-[68px] items-end justify-center px-2.5 pt-3 md:min-h-[82px] md:px-3 md:pt-4">
                  <div className="flex h-[46px] w-[46px] items-center justify-center overflow-hidden p-1 sm:h-[54px] sm:w-[54px] md:h-[64px] md:w-[64px]">
                    {franchise.logo ? (
                      <img
                        src={franchise.logo}
                        alt={`${franchise.name} logo`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full scale-[1.06] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] transition duration-300"
                      />
                    ) : franchise.brandIcon ? (
                      <franchise.brandIcon
                        aria-label={`${franchise.name} logo`}
                        className="h-full w-full scale-[1.02] drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] transition-colors duration-300 group-hover:text-[#0f2742]"
                        style={{ color: franchise.logoColor }}
                      />
                    ) : (
                      <span
                        className="font-heading text-[1rem] tracking-[0.08em] text-[#0f172a] transition-colors duration-300 group-hover:text-[#0f2742] md:text-[1.2rem]"
                      >
                        {franchise.short}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 mt-auto flex min-h-[78px] flex-1 flex-col px-2.5 pb-2.5 pt-4 md:min-h-[92px] md:px-3 md:pb-3.5 md:pt-5">
                  <h3 className="line-clamp-2 font-body text-[0.92rem] font-bold leading-tight tracking-[-0.03em] text-[#0f172a] transition-colors duration-300 group-hover:text-[#0f2742] md:text-[1.05rem]">
                    {franchise.name}
                  </h3>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500 transition-colors duration-300 group-hover:text-[#35516f] md:text-[11px]">
                    {franchise.city}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500 transition-colors duration-300 group-hover:text-[#35516f] md:text-[11px]">
                    Owner: {franchise.owner}
                  </p>

                  <div className="mt-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 text-left transition-colors duration-300 group-hover:border-[#9dcdf0] group-hover:bg-[#edf7ff] md:mt-2.5 md:p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-condensed text-[9px] uppercase tracking-[0.16em] text-slate-500 transition-colors duration-300 group-hover:text-[#4a6c89] md:text-[10px]">
                        Owned Teams
                      </p>
                      <span className="rounded-full border border-[#b88a2a]/30 bg-[#fff7df] px-2 py-0.5 font-condensed text-[8px] uppercase tracking-[0.12em] text-[#b88a2a] transition-colors duration-300 group-hover:border-[#9dcdf0] group-hover:bg-white/80 group-hover:text-[#2c618f] md:text-[9px] md:tracking-[0.15em]">
                        {Math.min(franchise.linkedTeams.length, 3)}/3
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1 md:mt-2">
                      {franchise.linkedTeams.length > 0 ? (
                        franchise.linkedTeams.map((team) => (
                          <span
                            key={team.id}
                            className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-700 transition-colors duration-300 group-hover:bg-[#d8ecfb] group-hover:text-[#0f2742] md:text-[10px]"
                          >
                            {team.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 transition-colors duration-300 group-hover:text-[#35516f]">
                          No teams linked yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </RouteAction>
          ))}
        </div>
      )}
    </section>
  );
}
