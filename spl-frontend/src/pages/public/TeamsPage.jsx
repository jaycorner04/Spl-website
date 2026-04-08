import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SectionHeader from "../../components/common/SectionHeader";
import RouteAction from "../../components/common/RouteAction";
import TeamsGrid from "../../components/team/TeamsGrid";
import { getStandings } from "../../api/homeAPI";
import useFranchises from "../../hooks/useFranchises";
import useTeams from "../../hooks/useTeams";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getMediaUrl } from "../../utils/media";
import {
  findTeamBrandReference,
  getFallbackColor,
  getShortName,
} from "../../utils/teamBranding";

export default function TeamsPage() {
  const [searchParams] = useSearchParams();
  const { teams, loading, error } = useTeams();
  const { franchises } = useFranchises();
  const [standingsData, setStandingsData] = useState({});
  const franchiseId = searchParams.get("franchiseId") || "";

  useEffect(() => {
    let isMounted = true;

    async function fetchStandings() {
      try {
        const data = await getStandings();

        if (isMounted) {
          setStandingsData(data && typeof data === "object" ? data : {});
        }
      } catch (requestError) {
        if (isMounted) {
          console.error(
            "Teams page standings fetch error:",
            getApiErrorMessage(
              requestError,
              "Unable to load live standings for the teams page."
            )
          );
          setStandingsData({});
        }
      }
    }

    fetchStandings();

    return () => {
      isMounted = false;
    };
  }, []);

  const approvedFranchiseIds = useMemo(
    () =>
      new Set(
        franchises
          .filter((franchise) => {
            const normalizedStatus = String(franchise.status || "")
              .trim()
              .toLowerCase();
            return !normalizedStatus || normalizedStatus === "approved";
          })
          .map((franchise) => String(franchise.id))
      ),
    [franchises]
  );

  const activeFranchise = useMemo(() => {
    return franchises.find(
      (franchise) =>
        String(franchise.id) === String(franchiseId) &&
        approvedFranchiseIds.has(String(franchise.id))
    );
  }, [approvedFranchiseIds, franchiseId, franchises]);

  const visibleTeams = useMemo(() => {
    const publicTeams = teams.filter((team) => {
      const linkedFranchiseId = String(team.franchise_id || "");
      return !linkedFranchiseId || approvedFranchiseIds.has(linkedFranchiseId);
    });

    if (!franchiseId) {
      return publicTeams;
    }

    return publicTeams.filter(
      (team) => String(team.franchise_id || "") === String(franchiseId)
    );
  }, [approvedFranchiseIds, franchiseId, teams]);

  const standingsByTeamName = useMemo(() => {
    const seasonRows = Array.isArray(standingsData?.season)
      ? standingsData.season
      : [];

    return seasonRows.reduce((accumulator, row) => {
      const key = String(row?.team || "")
        .trim()
        .toLowerCase();

      if (!key) {
        return accumulator;
      }

      accumulator[key] = {
        wins: Number(row?.won ?? 0),
        losses: Number(row?.lost ?? 0),
        points: Number(row?.pts ?? 0),
        nrr: String(row?.nrr ?? "0.000"),
      };

      return accumulator;
    }, {});
  }, [standingsData]);

  const formattedTeams = visibleTeams.map((team) => {
    const reference = findTeamBrandReference(team.team_name);
    const liveStanding =
      standingsByTeamName[String(team.team_name || "").trim().toLowerCase()] ||
      {};
    const safeColor =
      reference?.color || getFallbackColor(team.primary_color) || "#334155";

    return {
      id: team.id,
      shortName: getShortName(team.team_name || "TM"),
      teamName: team.team_name || "SPL Team",
      city: team.city || "SPL Franchise",
      captain: team.vice_coach || team.captain || "TBA",
      wins: Number(liveStanding.wins ?? 0),
      losses: Number(liveStanding.losses ?? 0),
      points: Number(liveStanding.points ?? 0),
      nrr: String(liveStanding.nrr ?? "0.000"),
      color: safeColor,
      logo: getMediaUrl(team.logo),
      brandIcon: reference?.brandIcon || null,
      logoColor: reference?.logoColor || safeColor,
    };
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 sm:py-14 lg:px-6 xl:px-8">
          <SectionHeader title="SPL" highlight="TEAMS" darkMode={false} />

          <p className="max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Explore all franchises participating in the Software Premier League.
            View team information, captain details, and official team identity
            in a clean responsive layout.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        {franchiseId ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-condensed text-sm uppercase tracking-[0.16em] text-[#5f2439]">
                Franchise Teams
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Showing teams under{" "}
                <span className="font-semibold text-slate-900">
                  {activeFranchise?.company_name || "the selected franchise"}
                </span>
                .
              </p>
            </div>

            <RouteAction
              to="/teams"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              View All Teams
            </RouteAction>
          </div>
        ) : null}

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Loading teams...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        ) : formattedTeams.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            No teams found.
          </div>
        ) : (
          <TeamsGrid teams={formattedTeams} />
        )}
      </section>
    </div>
  );
}
