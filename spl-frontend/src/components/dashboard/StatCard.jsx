const topBorderMap = {
  gold: "before:bg-yellow-500",
  red: "before:bg-red-500",
  green: "before:bg-emerald-500",
  blue: "before:bg-blue-500",
  purple: "before:bg-purple-500",
  orange: "before:bg-orange-500",
};

const valueColorMap = {
  gold: "text-yellow-600",
  red: "text-red-500",
  green: "text-emerald-500",
  blue: "text-blue-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
};

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  color = "gold",
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] before:absolute before:left-0 before:right-0 before:top-0 before:h-[3px] ${topBorderMap[color]}`}
    >
      <p className="font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h3
            className={`font-heading text-4xl leading-none tracking-[0.04em] ${valueColorMap[color]}`}
          >
            {value}
          </h3>
          <p className="mt-2 text-xs text-slate-500">{subtext}</p>
        </div>

        <span className="text-3xl opacity-30">{icon}</span>
      </div>
    </div>
  );
}