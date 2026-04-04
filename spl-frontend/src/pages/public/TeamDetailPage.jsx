import { useMemo } from "react";
import { useParams } from "react-router-dom";
import SectionHeader from "../../components/common/SectionHeader";
import TeamHeroCard from "../../components/team/TeamHeroCard";
import TeamInfoList from "../../components/team/TeamInfoList";
import TeamSquadSection from "../../components/team/TeamSquadSection";
import usePlayers from "../../hooks/usePlayers";
import useTeams from "../../hooks/useTeams";
import { getMediaUrl } from "../../utils/media";
import {
  getFallbackColor,
  getShortName,
  getTeamBrandReference,
} from "../../utils/teamBranding";

function getPlayerColor(playerId = 0) {
  const palette = [
    "#FACC15",
    "#60A5FA",
    "#4ADE80",
    "#F87171",
    "#C084FC",
    "#FB923C",
    "#F472B6",
    "#22D3EE",
  ];

  return palette[playerId % palette.length];
}

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const { teams, loading, error } = useTeams();
  const playerFilters = useMemo(() => ({ teamId }), [teamId]);
  const {
    players: teamPlayers,
    loading: playersLoading,
    error: playersError,
  } = usePlayers(playerFilters);

  const team = useMemo(() => {
    return teams.find((item) => String(item.id) === String(teamId));
  }, [teams, teamId]);

  const formattedPlayers = useMemo(() => {
    return teamPlayers.map((player) => ({
      id: player.id,
      name: player.full_name || "SPL Player",
      role: player.role || "Player",
      battingStyle: player.batting_style,
      bowlingStyle: player.bowling_style,
      email: player.email,
      mobile: player.mobile,
      image: getMediaUrl(player.photo),
      color: getPlayerColor(player.id),
    }));
  }, [teamPlayers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
            <SectionHeader title="TEAM" highlight="OVERVIEW" darkMode={false} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading team details...
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
            <SectionHeader title="TEAM" highlight="OVERVIEW" darkMode={false} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            {error}
          </div>
        </section>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
            <SectionHeader title="TEAM" highlight="OVERVIEW" darkMode={false} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Team not found.
          </div>
        </section>
      </div>
    );
  }

  const teamBrand = getTeamBrandReference(team.team_name);
  const formattedTeam = {
    ...(teamBrand || {}),
    id: team.id,
    shortName: getShortName(team.team_name),
    teamName: team.team_name,
    city: team.city || "SPL Franchise",
    color: teamBrand?.color || getFallbackColor(team.primary_color),
    logo: getMediaUrl(team.logo),
    captain: team.vice_coach || "TBA",
    owner: team.owner || team.coach || "TBA",
    venue: team.venue || "Venue details not available yet",
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
          <SectionHeader title="TEAM" highlight="OVERVIEW" darkMode={false} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <TeamHeroCard
            shortName={formattedTeam.shortName}
            teamName={formattedTeam.teamName}
            city={formattedTeam.city}
            color={formattedTeam.color}
            logo={formattedTeam.logo}
            brandIcon={formattedTeam.brandIcon}
            logoColor={formattedTeam.logoColor}
            lightMode
          />

          <TeamInfoList
            captain={formattedTeam.captain}
            owner={formattedTeam.owner}
            venue={formattedTeam.venue}
            lightMode
          />
        </div>

        <div className="mt-8">
          <TeamSquadSection
            players={formattedPlayers}
            loading={playersLoading}
            error={playersError}
            lightMode
          />
        </div>
      </section>
    </div>
  );
}
