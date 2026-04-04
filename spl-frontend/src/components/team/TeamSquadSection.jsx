import RouteAction from "../common/RouteAction";

function getPlayerInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamSquadSection({
  players = [],
  loading = false,
  error = "",
  lightMode = false,
}) {
  return (
    <div
      className={`rounded-[24px] border p-6 ${
        lightMode
          ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className={`font-condensed text-2xl uppercase tracking-[0.12em] ${
              lightMode ? "text-slate-900" : "text-white"
            }`}
          >
            Team Players
          </h2>
          <p
            className={`mt-2 text-sm ${
              lightMode ? "text-slate-500" : "text-slate-300"
            }`}
          >
            Browse the live squad for this franchise.
          </p>
        </div>

        <div
          className={`inline-flex rounded-full border px-4 py-2 font-condensed text-xs uppercase tracking-[0.16em] ${
            lightMode
              ? "border-yellow-300 bg-yellow-50 text-yellow-700"
              : "border-white/15 bg-white/10 text-white"
          }`}
        >
          {players.length} Players
        </div>
      </div>

      {loading ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-6 text-center ${
            lightMode ? "bg-slate-50 text-slate-500" : "bg-white/5 text-slate-300"
          }`}
        >
          Loading team players...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-red-600">
          {error}
        </div>
      ) : players.length === 0 ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-6 text-center ${
            lightMode ? "bg-slate-50 text-slate-500" : "bg-white/5 text-slate-300"
          }`}
        >
          No players found for this team.
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <RouteAction
              key={player.id}
              to={`/players/${player.id}`}
              className="block rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300 hover:bg-white hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                  {player.image ? (
                    <img
                      src={player.image}
                      alt={player.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full text-lg font-heading tracking-[0.08em]"
                      style={{
                        backgroundColor: `${player.color}14`,
                        color: player.color,
                      }}
                    >
                      {getPlayerInitials(player.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-condensed text-2xl uppercase tracking-[0.1em] text-slate-900">
                      {player.name}
                    </h3>
                    <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 font-condensed text-[11px] uppercase tracking-[0.16em] text-blue-600">
                      {player.role}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                      <div className="font-condensed text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Batting Style
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        {player.battingStyle || "N/A"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                      <div className="font-condensed text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        Bowling Style
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-800">
                        {player.bowlingStyle || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-500">
                    {player.email || player.mobile || "Contact details unavailable"}
                  </div>
                </div>
              </div>
            </RouteAction>
          ))}
        </div>
      )}
    </div>
  );
}
