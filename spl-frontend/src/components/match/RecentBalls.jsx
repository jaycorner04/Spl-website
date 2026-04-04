export default function RecentBalls({ balls, lightMode = false }) {
  const getBallStyle = (ball) => {
    if (ball === "W") {
      return lightMode
        ? "border-red-300 bg-red-50 text-red-500"
        : "border-red-400/20 bg-red-500/10 text-red-400";
    }

    if (ball === "4") {
      return lightMode
        ? "border-emerald-300 bg-emerald-50 text-emerald-500"
        : "border-green-400/20 bg-green-500/10 text-green-400";
    }

    if (ball === "6") {
      return lightMode
        ? "border-yellow-300 bg-yellow-50 text-yellow-600"
        : "border-yellow-300/20 bg-yellow-300/10 text-yellow-300";
    }

    return lightMode
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-white/10 bg-white/5 text-slate-200";
  };

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
        Recent Balls
      </h2>

      <div className="mt-5 flex flex-wrap gap-3">
        {balls.map((ball, index) => (
          <div
            key={`${ball}-${index}`}
            className={`flex h-12 w-12 items-center justify-center rounded-full border font-condensed text-lg ${getBallStyle(
              ball
            )}`}
          >
            {ball}
          </div>
        ))}
      </div>
    </div>
  );
}