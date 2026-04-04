import RouteAction from "../common/RouteAction";
import { findTeamBrandReference } from "../../utils/teamBranding";

export default function SquadGrid({
  players,
  teamName = "",
  lightMode = false,
}) {
  const teamBrand = findTeamBrandReference(teamName);
  const TeamBrandIcon = teamBrand?.brandIcon;
  const renderAvatar = (player) => {
    if (player.image) {
      return (
        <img
          src={player.image}
          alt={player.name}
          className="h-full w-full rounded-full object-cover"
        />
      );
    }

    if (TeamBrandIcon) {
      return (
        <TeamBrandIcon
          aria-hidden="true"
          className="h-full w-full"
          style={{ color: teamBrand?.logoColor || "#334155" }}
        />
      );
    }

    return (
      <span>
        {String(player.name || "")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)}
      </span>
    );
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {players.map((player) => (
        <RouteAction
          key={player.id}
          to={`/players/${player.id}`}
          className="block text-left"
        >
          <div
            className={`relative overflow-hidden rounded-[24px] border p-5 transition-all duration-300 hover:-translate-y-1 ${
              lightMode
                ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:border-yellow-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)]"
                : "border-white/10 bg-white/5 hover:border-yellow-300/30 hover:bg-white/10"
            }`}
          >
            {teamBrand ? (
              <div
                className={`absolute inset-0 ${
                  lightMode
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.04),transparent_30%)]"
                    : "bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.06),transparent_30%)]"
                }`}
              />
            ) : null}

            <div className="relative z-10">
              <div
                className={`mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border p-2 font-condensed text-3xl uppercase tracking-[0.2em] ${
                  player.image || TeamBrandIcon
                    ? lightMode
                      ? "border-yellow-300/50 bg-yellow-50 shadow-[0_0_20px_rgba(250,204,21,0.10)]"
                      : "border-yellow-300/40 bg-[radial-gradient(circle,rgba(250,204,21,0.12)_0%,rgba(255,255,255,0.03)_45%,rgba(0,0,0,0.12)_100%)] shadow-[0_0_20px_rgba(250,204,21,0.16)]"
                    : lightMode
                      ? "border-slate-200 bg-slate-100 text-slate-500"
                      : "border-white/15 bg-white/10 text-white/70"
                }`}
              >
                {renderAvatar(player)}
              </div>

              <h3
                className={`font-condensed text-2xl uppercase tracking-[0.12em] ${
                  lightMode ? "text-slate-900" : "text-white"
                }`}
              >
                {player.name}
              </h3>

              <div className="mt-4 flex flex-wrap gap-3">
                <div
                  className={`rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] ${
                    lightMode
                      ? "border-blue-300 bg-blue-50 text-blue-600"
                      : "border-blue-400/20 bg-blue-500/10 text-blue-300"
                  }`}
                >
                  {player.battingStyle}
                </div>

                <div
                  className={`rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] ${
                    lightMode
                      ? "border-red-300 bg-red-50 text-red-500"
                      : "border-red-400/20 bg-red-500/10 text-red-300"
                  }`}
                >
                  {player.bowlingStyle}
                </div>
              </div>
            </div>
          </div>
        </RouteAction>
      ))}
    </div>
  );
}
