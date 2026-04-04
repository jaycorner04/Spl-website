import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SectionHeader from "../../components/common/SectionHeader";
import PlayersGrid from "../../components/player/PlayersGrid";
import usePlayers from "../../hooks/usePlayers";
import { getMediaUrl } from "../../utils/media";
import abhishekImage from "../../assets/players/raynx-rockets/abhishek-optimized.png";
import sandeepImage from "../../assets/players/raynx-rockets/sandeep-optimized.png";
import viswanadhImage from "../../assets/players/raynx-rockets/viswanadh.png";

const filterOptions = [
  "All",
  "Right hand",
  "Right Hand",
  "spinner",
  "speedbowler",
  "lefthalfspin",
];

function getPlayerInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getPlayerColor(index) {
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

  return palette[index % palette.length];
}

const homePagePlayerReference = [
  {
    name: "Viswanadh",
    role: "All-Rounder",
    team: "Infosys",
    points: 243,
    image: viswanadhImage,
    stat1: { label: "Runs", value: "103" },
    stat2: { label: "Wkts", value: "3" },
  },
  {
    name: "Abhishek",
    role: "Batsman",
    team: "Wipro",
    points: 228,
    image: abhishekImage,
    stat1: { label: "Runs", value: "228" },
    stat2: { label: "SR", value: "145.5" },
  },
  {
    name: "Prasad",
    role: "Bowler",
    team: "HCL",
    points: 214,
    image: null,
    stat1: { label: "Wkts", value: "4" },
    stat2: { label: "BBI", value: "4/21" },
  },
  {
    name: "Sandeep",
    role: "All-Rounder",
    team: "Reliance",
    points: 201,
    image: sandeepImage,
    stat1: { label: "Runs", value: "111" },
    stat2: { label: "Wkts", value: "2" },
  },
  {
    name: "Santhosh",
    role: "Batsman",
    team: "Zoho",
    points: 189,
    image: null,
    stat1: { label: "Runs", value: "189" },
    stat2: { label: "SR", value: "142.8" },
  },
];

export default function PlayersPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchParams, setSearchParams] = useSearchParams();
  const { players, loading, error } = usePlayers();
  const selectedTeamId = searchParams.get("teamId");
  const selectedTeamName = searchParams.get("teamName") || "";

  const formattedPlayers = useMemo(() => {
    return players.map((player, index) => {
      const reference =
        homePagePlayerReference.find(
          (item) =>
            item.name.toLowerCase() === String(player.full_name).toLowerCase()
        ) || homePagePlayerReference[index % homePagePlayerReference.length];

      return {
        id: player.id,
        teamId: player.team_id,
        name: player.full_name || reference.name,
        role: player.role || reference.role || "Player",
        team: player.team_name || reference.team || "SPL Player",
        points: reference.points ?? 0,
        stat1: reference.stat1 || {
          label: "Batting Style",
          value: player.batting_style || "N/A",
        },
        stat2: reference.stat2 || {
          label: "Bowling Style",
          value: player.bowling_style || "N/A",
        },
        shortName: getPlayerInitials(player.full_name || reference.name),
        color: getPlayerColor(index),
        image: getMediaUrl(player.photo) || reference.image,
        battingStyle: player.batting_style,
        bowlingStyle: player.bowling_style,
      };
    });
  }, [players]);

  const teamFilteredPlayers = useMemo(() => {
    if (!selectedTeamId && !selectedTeamName) {
      return formattedPlayers;
    }

    return formattedPlayers.filter((player) => {
      const matchesTeamId = selectedTeamId
        ? String(player.teamId ?? "") === String(selectedTeamId)
        : false;
      const matchesTeamName = selectedTeamName
        ? String(player.team).toLowerCase() === selectedTeamName.toLowerCase()
        : false;

      return matchesTeamId || matchesTeamName;
    });
  }, [formattedPlayers, selectedTeamId, selectedTeamName]);

  const filteredPlayers = useMemo(() => {
    if (activeFilter === "All") return teamFilteredPlayers;

    return teamFilteredPlayers.filter(
      (player) =>
        player.battingStyle === activeFilter ||
        player.bowlingStyle === activeFilter
    );
  }, [teamFilteredPlayers, activeFilter]);

  const showingTeamPlayers = Boolean(selectedTeamId || selectedTeamName);

  function clearTeamFilter() {
    setSearchParams({});
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 sm:py-14 lg:px-6 xl:px-8">
          <SectionHeader title="SPL" highlight="PLAYERS" darkMode={false} />

          <p className="max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Explore SPL players, their profiles, batting style, bowling style,
            and employee role details in a clean responsive layout.
          </p>

          {showingTeamPlayers ? (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-medium text-slate-700 sm:text-base">
                Showing players for{" "}
                <span className="font-condensed uppercase tracking-[0.14em] text-red-500">
                  {selectedTeamName || `Team ${selectedTeamId}`}
                </span>
              </p>
              <button
                type="button"
                onClick={clearTeamFilter}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 font-condensed text-xs uppercase tracking-[0.16em] text-slate-700 transition-colors duration-300 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              >
                View All Players
              </button>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                className={`rounded-full border px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.16em] transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${
                  activeFilter === option
                    ? "border-yellow-300 bg-yellow-50 text-yellow-600"
                    : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Loading players...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            {showingTeamPlayers
              ? "No players found for this team."
              : "No players found."}
          </div>
        ) : (
          <PlayersGrid players={filteredPlayers} />
        )}
      </section>
    </div>
  );
}
