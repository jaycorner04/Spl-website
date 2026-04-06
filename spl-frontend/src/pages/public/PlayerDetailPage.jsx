import { useMemo } from "react";
import { useParams } from "react-router-dom";
import SectionHeader from "../../components/common/SectionHeader";
import PlayerInfoPanel from "../../components/player/PlayerInfoPanel";
import PlayerStatsSection from "../../components/player/PlayerStatsSection";
import usePlayers from "../../hooks/usePlayers";
import { getMediaUrl } from "../../utils/media";

function getPlayerInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPlayerColor(playerId) {
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

export default function PlayerDetailPage() {
  const { playerId } = useParams();
  const { players, loading, error } = usePlayers({ status: "Active" });

  const player = useMemo(() => {
    return players.find((item) => String(item.id) === String(playerId));
  }, [players, playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
            <SectionHeader title="PLAYER" highlight="OVERVIEW" darkMode={false} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading player details...
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
            <SectionHeader title="PLAYER" highlight="OVERVIEW" darkMode={false} />
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

  if (!player) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
            <SectionHeader title="PLAYER" highlight="OVERVIEW" darkMode={false} />
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Player not found.
          </div>
        </section>
      </div>
    );
  }

  const playerColor = getPlayerColor(player.id);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
          <SectionHeader title="PLAYER" highlight="OVERVIEW" darkMode={false} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        <PlayerInfoPanel
          name={player.full_name}
          team={player.team_name || "SPL Player"}
          role={player.role || "Player"}
          joinYear={new Date(player.created_at).getFullYear().toString()}
          battingStyle={player.batting_style || "N/A"}
          bowlingStyle={player.bowling_style || "N/A"}
          dob={player.date_of_birth || "N/A"}
          matches={0}
          shortName={getPlayerInitials(player.full_name)}
          color={playerColor}
          image={getMediaUrl(player.photo)}
          lightMode
        />

        <div className="mt-8">
          <PlayerStatsSection
            title="Player Information"
            stats={[
              { label: "Mobile", value: player.mobile || "N/A" },
              { label: "Email", value: player.email || "N/A" },
              { label: "Batting Style", value: player.batting_style || "N/A" },
              { label: "Bowling Style", value: player.bowling_style || "N/A" },
            ]}
            lightMode
          />
        </div>
      </section>
    </div>
  );
}
