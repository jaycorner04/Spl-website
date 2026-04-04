export default function PlayerInfoPanel({
  name,
  team,
  role,
  joinYear,
  battingStyle,
  bowlingStyle,
  dob,
  matches,
  color,
  shortName,
  image,
  lightMode = false,
}) {
  const safeColor = color || "#2563EB";

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
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
              ? "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.04),transparent_30%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_30%)]"
          }`}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          {image ? (
            <div
              className={`relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border p-1 ${
                lightMode
                  ? "border-slate-200 bg-white shadow-[0_0_30px_rgba(15,23,42,0.08)]"
                  : "border-white/10 bg-white/10"
              }`}
            >
              <img
                src={image}
                alt={name}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full border text-5xl font-heading tracking-[0.08em]"
              style={{
                backgroundColor: lightMode ? `${safeColor}14` : `${safeColor}20`,
                borderColor: `${safeColor}66`,
                color: safeColor,
              }}
            >
              {shortName}
            </div>
          )}

          <h1
            className={`mt-5 font-heading text-4xl tracking-[0.08em] ${
              lightMode ? "text-slate-900" : "text-white"
            }`}
          >
            {name}
          </h1>

          <p
            className={`mt-2 text-lg ${
              lightMode ? "text-slate-500" : "text-slate-300"
            }`}
          >
            {team}
          </p>

          <div
            className={`mt-4 inline-flex rounded-full border px-4 py-2 font-condensed text-sm uppercase tracking-[0.16em] ${
              lightMode
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-white/15 bg-white/10 text-white"
            }`}
          >
            Player Profile
          </div>
        </div>
      </div>

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
          Player Overview
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Role
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {role}
            </div>
          </div>

          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Joining Franchise
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {joinYear}
            </div>
          </div>

          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Batting Style
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {battingStyle}
            </div>
          </div>

          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Bowling Style
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {bowlingStyle}
            </div>
          </div>

          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Date of Birth
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {dob}
            </div>
          </div>

          <div className={`rounded-xl px-4 py-4 ${lightMode ? "bg-slate-50" : "bg-white/5"}`}>
            <div className={lightMode ? "text-sm text-slate-500" : "text-sm text-slate-300"}>
              Matches
            </div>
            <div className={lightMode ? "mt-1 font-medium text-slate-900" : "mt-1 font-medium text-white"}>
              {matches}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}