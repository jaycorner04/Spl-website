export default function TeamHeroCard({
  shortName,
  teamName,
  city,
  color,
  logo,
  brandIcon: BrandIcon,
  logoColor,
  lightMode = false,
}) {
  const safeColor = color || "#334155";
  const safeLogoColor = logoColor || safeColor;

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border p-6 ${
        lightMode
          ? "border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
          : "border-white/10 bg-white/5"
      }`}
      >
      <div
        className={`absolute inset-0 ${
          lightMode
            ? "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.05),transparent_28%)]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28%)]"
        }`}
      />

      {logo ? (
        <div className="pointer-events-none absolute right-[-20px] top-1/2 hidden h-56 w-56 -translate-y-1/2 opacity-10 sm:block">
          <img
            src={logo}
            alt={`${teamName} background logo`}
            className="h-full w-full object-contain"
          />
        </div>
      ) : BrandIcon ? (
        <div className="pointer-events-none absolute right-[-24px] top-1/2 hidden h-56 w-56 -translate-y-1/2 opacity-[0.10] sm:block">
          <BrandIcon
            aria-hidden="true"
            className="h-full w-full"
            style={{ color: safeLogoColor }}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        {logo ? (
          <div
            className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border p-2 sm:h-32 sm:w-32 ${
              lightMode
                ? "border-slate-200 bg-white shadow-[0_0_30px_rgba(15,23,42,0.08)]"
                : "border-white/10 bg-white/10"
            }`}
          >
            <img
              src={logo}
              alt={`${teamName} logo`}
              className="h-full w-full object-contain"
            />
          </div>
        ) : BrandIcon ? (
          <div
            className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border p-4 sm:h-32 sm:w-32 ${
              lightMode
                ? "border-slate-200 bg-white shadow-[0_0_30px_rgba(15,23,42,0.08)]"
                : "border-white/10 bg-white/10"
            }`}
          >
            <BrandIcon
              className="h-full w-full"
              style={{ color: safeLogoColor }}
              aria-label={`${teamName} logo`}
            />
          </div>
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border text-4xl font-heading tracking-[0.08em]"
            style={{
              backgroundColor: lightMode ? `${safeColor}14` : `${safeColor}20`,
              borderColor: `${safeColor}66`,
              color: safeColor,
            }}
          >
            {shortName}
          </div>
        )}

        <div>
          <h1
            className={`font-heading text-4xl tracking-[0.08em] sm:text-5xl ${
              lightMode ? "text-slate-900" : "text-white"
            }`}
          >
            {teamName}
          </h1>

          <p
            className={`mt-2 text-lg ${
              lightMode ? "text-slate-500" : "text-slate-300"
            }`}
          >
            {city}
          </p>

          <div
            className={`mt-4 inline-flex rounded-full border px-4 py-2 font-condensed text-sm uppercase tracking-[0.16em] ${
              lightMode
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-white/15 bg-white/10 text-white"
            }`}
          >
            Team Profile
          </div>
        </div>
      </div>
    </div>
  );
}
