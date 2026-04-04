export default function LiveMatchHeader({
  teamA,
  teamB,
  status,
  venue,
  matchInfo,
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
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] ${
                lightMode
                  ? "border-red-300 bg-red-50 text-red-500"
                  : "border-red-400/20 bg-red-500/10 text-red-400"
              }`}
            >
              {status}
            </div>

            <div className={`text-sm ${lightMode ? "text-slate-500" : "text-slate-300"}`}>
              {matchInfo}
            </div>
          </div>

          <h1
            className={`font-heading text-4xl tracking-[0.08em] sm:text-5xl ${
              lightMode ? "text-slate-900" : "text-white"
            }`}
          >
            {teamA}{" "}
            <span className={lightMode ? "text-yellow-500" : "text-yellow-300"}>
              VS
            </span>{" "}
            {teamB}
          </h1>

          <p className={`mt-3 text-base ${lightMode ? "text-slate-500" : "text-slate-300"}`}>
            {venue}
          </p>
        </div>
      </div>
    </div>
  );
}