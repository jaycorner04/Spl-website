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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {formattedFranchises.map((franchise) => (
            <RouteAction
              key={franchise.id}
              to={franchise.route}
              className="group block h-full text-left"
            >
              <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[10px] border border-white/10 bg-white text-center shadow-[0_14px_38px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#853953] hover:bg-[#853953] hover:shadow-[0_18px_44px_rgba(95,36,57,0.24)]">
                <div className="pointer-events-none absolute left-1/2 top-[42%] h-[180px] w-[180%] -translate-x-1/2 rounded-[50%] bg-[rgba(15,23,42,0.05)] transition-colors duration-300 group-hover:bg-white/10" />

                <div className="relative z-10 flex min-h-[150px] items-end justify-center px-6 pt-8">
                  <div className="flex h-[122px] w-[122px] items-center justify-center overflow-hidden p-1 sm:h-[132px] sm:w-[132px]">
                    {franchise.logo ? (
                      <img
                        src={franchise.logo}
                        alt={`${franchise.name} logo`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full scale-[1.06] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] transition duration-300 group-hover:brightness-0 group-hover:invert"
                      />
                    ) : franchise.brandIcon ? (
                      <franchise.brandIcon
                        aria-label={`${franchise.name} logo`}
                        className="h-full w-full scale-[1.02] drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)] transition-colors duration-300 group-hover:text-white"
                        style={{ color: franchise.logoColor }}
                      />
                    ) : (
                      <span
                        className="font-heading text-[2rem] tracking-[0.08em] text-[#0f172a] transition-colors duration-300 group-hover:text-white"
                      >
                        {franchise.short}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 mt-auto flex min-h-[160px] flex-1 flex-col px-5 pb-8 pt-12">
                  <h3 className="line-clamp-2 font-body text-[1.95rem] font-bold leading-tight tracking-[-0.03em] text-[#0f172a] transition-colors duration-300 group-hover:text-white">
                    {franchise.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 transition-colors duration-300 group-hover:text-white/80">
                    {franchise.city}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 transition-colors duration-300 group-hover:text-white/80">
                    Owner: {franchise.owner}
                  </p>

                  <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-left transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-condensed text-xs uppercase tracking-[0.2em] text-slate-500 transition-colors duration-300 group-hover:text-white/70">
                        Owned Teams
                      </p>
                      <span className="rounded-full border border-[#b88a2a]/30 bg-[#fff7df] px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] text-[#b88a2a] transition-colors duration-300 group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white">
                        {Math.min(franchise.linkedTeams.length, 3)}/3
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {franchise.linkedTeams.length > 0 ? (
                        franchise.linkedTeams.map((team) => (
                          <span
                            key={team.id}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white"
                          >
                            {team.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 transition-colors duration-300 group-hover:text-white/80">
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
