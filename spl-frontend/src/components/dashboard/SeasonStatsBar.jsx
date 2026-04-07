export default function SeasonStatsBar({
  stats = [],
  loading = false,
  error = "",
}) {
  const seasonStats = Array.isArray(stats) ? stats : [];
  const hasStats = seasonStats.length > 0;

  return (
    <section
      className="relative z-10 border-y border-slate-200 bg-white"
      aria-busy={loading}
    >
      {hasStats ? (
        <div className="spl-home-shell grid w-full gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {seasonStats.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center"
            >
              <div className="font-heading text-3xl leading-none text-yellow-500 sm:text-4xl">
                {item.value}
              </div>
              <div className="mt-2 font-condensed text-xs uppercase tracking-[0.16em] text-slate-700 sm:text-sm">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="spl-home-shell py-6 text-center text-sm text-slate-500">
          Season totals will appear here once live backend stats are available.
        </div>
      )}

      {error ? (
        <p className="spl-home-shell pb-5 text-center text-xs text-slate-500">
          Live season totals are temporarily unavailable right now.
        </p>
      ) : null}
    </section>
  );
}
