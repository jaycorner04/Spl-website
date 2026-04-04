export default function PlayerStatsSection({
  title,
  stats,
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
      <h2
        className={`font-condensed text-2xl uppercase tracking-[0.12em] ${
          lightMode ? "text-slate-900" : "text-white"
        }`}
      >
        {title}
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className={`rounded-xl px-4 py-5 text-center ${
              lightMode ? "bg-slate-50" : "bg-white/5"
            }`}
          >
            <div className={`font-heading text-4xl leading-none ${lightMode ? "text-yellow-500" : "text-yellow-300"}`}>
              {item.value}
            </div>
            <div
              className={`mt-2 font-condensed text-sm uppercase tracking-[0.18em] ${
                lightMode ? "text-slate-500" : "text-slate-300"
              }`}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}