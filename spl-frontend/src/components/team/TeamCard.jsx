import RouteAction from "../common/RouteAction";

export default function TeamCard({
  id,
  shortName,
  teamName,
  city,
  captain,
  wins,
  losses,
  points,
  nrr,
  color,
  logo,
  brandIcon: BrandIcon,
  logoColor,
}) {
  const safeColor = color || "#334155";
  const safeNrr = typeof nrr === "string" ? nrr : "0.000";
  const showPositiveNrr = safeNrr.startsWith("+") || safeNrr === "0.000";

  return (
    <RouteAction to={`/teams/${id}`} className="block h-full text-left">
      <div className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-300/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:p-6">
        <div className="flex min-h-[88px] items-start justify-between gap-4 sm:min-h-[96px]">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white p-2 shadow-sm sm:h-[84px] sm:w-[84px]">
            {logo ? (
              <img
                src={logo}
                alt={`${teamName} logo`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain"
              />
            ) : BrandIcon ? (
              <BrandIcon
                className="h-full w-full p-2"
                style={{ color: logoColor || safeColor }}
                aria-label={`${teamName} logo`}
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
            <div className="font-heading text-lg leading-none text-yellow-500 sm:text-2xl">
              {points}
            </div>
            <div className="mt-1 font-condensed text-[10px] uppercase tracking-[0.18em] text-yellow-700">
              PTS
            </div>
          </div>
        </div>

        <div className="mt-5 min-h-[88px] sm:min-h-[96px]">
          <h3 className="line-clamp-2 font-condensed text-[1.35rem] uppercase leading-tight tracking-[0.1em] text-slate-900 sm:text-[1.7rem]">
            {teamName}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{city}</p>
        </div>

        <div className="mt-5 flex flex-1 flex-col space-y-3">
          <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">Captain</span>
            <span className="max-w-[55%] truncate text-right font-medium text-slate-900">
              {captain}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
              <div className="font-heading text-3xl leading-none text-emerald-500">
                {wins}
              </div>
              <div className="mt-2 font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                Wins
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
              <div className="font-heading text-3xl leading-none text-red-500">
                {losses}
              </div>
              <div className="mt-2 font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                Losses
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600">Net Run Rate</span>
              <span
                className={`shrink-0 font-semibold ${
                  showPositiveNrr ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {safeNrr}
              </span>
            </div>
          </div>
        </div>
      </div>
    </RouteAction>
  );
}
