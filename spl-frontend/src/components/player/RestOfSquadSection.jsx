import RouteAction from "../common/RouteAction";
import { findTeamBrandReference } from "../../utils/teamBranding";

export default function RestOfSquadSection({
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
    <div
      className={`rounded-[24px] border p-6 ${
        lightMode
          ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <h2
        className={`font-condensed text-2xl uppercase tracking-[0.12em] ${
          lightMode ? "text-slate-900" : "text-white"
        }`}
      >
        Rest of Squad
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {players.map((player) => (
          <RouteAction
            key={player.id}
            to={`/players/${player.id}`}
            className="block text-left"
          >
            <div
              className={`rounded-xl px-4 py-5 transition-all duration-300 ${
                lightMode
                  ? "bg-slate-50 hover:bg-slate-100"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border p-2 font-condensed text-lg uppercase tracking-[0.18em] ${
                  player.image || TeamBrandIcon
                    ? lightMode
                      ? "border-yellow-300/40 bg-yellow-50 shadow-[0_0_16px_rgba(250,204,21,0.10)]"
                      : "border-yellow-300/35 bg-[radial-gradient(circle,rgba(250,204,21,0.12)_0%,rgba(255,255,255,0.03)_45%,rgba(0,0,0,0.12)_100%)] shadow-[0_0_16px_rgba(250,204,21,0.15)]"
                    : lightMode
                      ? "border-slate-200 bg-slate-100 text-slate-500"
                      : "border-white/15 bg-white/10 text-white/70"
                }`}
              >
                {renderAvatar(player)}
              </div>

              <div
                className={`font-condensed text-xl uppercase tracking-[0.1em] ${
                  lightMode ? "text-slate-900" : "text-white"
                }`}
              >
                {player.name}
              </div>

              <div className={`mt-2 text-sm ${lightMode ? "text-slate-500" : "text-slate-300"}`}>
                {player.role}
              </div>
            </div>
          </RouteAction>
        ))}
      </div>
    </div>
  );
}
