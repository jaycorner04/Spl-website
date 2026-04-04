export default function ScoreSummaryCard({
  title,
  value,
  subtitle,
  accent = "yellow",
  lightMode = false,
}) {
  const accentClasses = {
    yellow: "text-yellow-500",
    red: "text-red-500",
    green: "text-emerald-500",
    blue: "text-blue-500",
  };

  return (
    <div
      className={`rounded-[24px] border p-6 text-center ${
        lightMode
          ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div
        className={`font-condensed text-sm uppercase tracking-[0.18em] ${
          lightMode ? "text-slate-500" : "text-slate-300"
        }`}
      >
        {title}
      </div>

      <div
        className={`mt-3 font-heading text-5xl leading-none ${
          accentClasses[accent]
        }`}
      >
        {value}
      </div>

      <div className={`mt-3 text-sm ${lightMode ? "text-slate-500" : "text-slate-400"}`}>
        {subtitle}
      </div>
    </div>
  );
}