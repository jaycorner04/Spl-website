export default function BattingTable({ players, lightMode = false }) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border ${
        lightMode
          ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div
        className={`border-b px-5 py-4 ${
          lightMode ? "border-slate-200" : "border-white/10"
        }`}
      >
        <h2
          className={`font-condensed text-2xl uppercase tracking-[0.12em] ${
            lightMode ? "text-slate-900" : "text-white"
          }`}
        >
          Batting Scorecard
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr
              className={`border-b ${
                lightMode
                  ? "border-slate-200 bg-slate-50"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>Batter</th>
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>R</th>
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>B</th>
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>4s</th>
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>6s</th>
              <th className={`px-4 py-4 text-left font-condensed text-sm uppercase tracking-[0.18em] ${lightMode ? "text-slate-500" : "text-slate-300"}`}>SR</th>
            </tr>
          </thead>

          <tbody>
            {players.map((player) => (
              <tr
                key={player.name}
                className={`border-b transition ${
                  lightMode
                    ? "border-slate-100 hover:bg-slate-50"
                    : "border-white/5 hover:bg-white/5"
                }`}
              >
                <td className="px-4 py-4">
                  <div className={lightMode ? "font-medium text-slate-900" : "font-medium text-white"}>
                    {player.name}
                  </div>
                  <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-400"}>
                    {player.status}
                  </div>
                </td>
                <td className={`px-4 py-4 ${lightMode ? "text-yellow-500" : "text-yellow-300"}`}>{player.runs}</td>
                <td className={`px-4 py-4 ${lightMode ? "text-slate-700" : "text-slate-200"}`}>{player.balls}</td>
                <td className={`px-4 py-4 ${lightMode ? "text-slate-700" : "text-slate-200"}`}>{player.fours}</td>
                <td className={`px-4 py-4 ${lightMode ? "text-slate-700" : "text-slate-200"}`}>{player.sixes}</td>
                <td className={`px-4 py-4 ${lightMode ? "text-slate-700" : "text-slate-200"}`}>{player.strikeRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}