import RouteAction from "../common/RouteAction";

export default function PlayerCard({
  id,
  name,
  role,
  team,
  points,
  stat1,
  stat2,
  shortName,
  color,
  image,
}) {
  const safeColor = color || "#2563EB";

  const roleStyles = {
    Batsman: "border-blue-300 bg-blue-50 text-blue-600",
    Bowler: "border-red-300 bg-red-50 text-red-500",
    "All-Rounder": "border-yellow-300 bg-yellow-50 text-yellow-600",
    Wicketkeeper: "border-emerald-300 bg-emerald-50 text-emerald-600",
  };

  const roleClassName =
    roleStyles[role] || "border-slate-300 bg-slate-50 text-slate-600";

  return (
    <RouteAction to={`/players/${id}`} className="block h-full text-left">
      <div className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:p-6">
        <div className="flex min-h-[96px] items-start justify-between gap-4">
          <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            {image ? (
              <img
                src={image}
                alt={name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-2xl font-heading tracking-[0.08em]"
                style={{
                  backgroundColor: `${safeColor}14`,
                  color: safeColor,
                }}
              >
                {shortName}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-full border border-yellow-300/40 bg-yellow-50 px-3 py-2 text-center sm:px-4">
            <div className="font-heading text-xl leading-none text-yellow-500 sm:text-2xl">
              {points}
            </div>
            <div className="mt-1 font-condensed text-[10px] uppercase tracking-[0.18em] text-yellow-700">
              SPL Pts
            </div>
          </div>
        </div>

        <div className="mt-5 min-h-[120px]">
          <div
            className={`inline-flex max-w-full rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] ${roleClassName}`}
          >
            <span className="truncate">{role}</span>
          </div>

          <h3 className="mt-4 line-clamp-2 font-condensed text-[1.7rem] uppercase leading-tight tracking-[0.1em] text-slate-900">
            {name}
          </h3>

          <p className="mt-2 text-sm text-slate-500">{team}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
            <div className="line-clamp-2 min-h-[56px] font-heading text-[1.9rem] leading-tight text-yellow-500">
              {stat1?.value ?? "-"}
            </div>
            <div className="mt-2 font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
              {stat1?.label ?? "Stat 1"}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
            <div className="line-clamp-2 min-h-[56px] font-heading text-[1.9rem] leading-tight text-yellow-500">
              {stat2?.value ?? "-"}
            </div>
            <div className="mt-2 font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
              {stat2?.label ?? "Stat 2"}
            </div>
          </div>
        </div>
      </div>
    </RouteAction>
  );
}
