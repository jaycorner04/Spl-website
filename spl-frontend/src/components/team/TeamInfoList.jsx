export default function TeamInfoList({
  captain,
  owner,
  venue,
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
        Franchise Details
      </h2>

      <div className="mt-5 space-y-4">
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-4 ${
            lightMode ? "bg-slate-50" : "bg-white/5"
          }`}
        >
          <span className={lightMode ? "text-slate-600" : "text-slate-300"}>
            Captain
          </span>
          <span className={lightMode ? "font-medium text-slate-900" : "font-medium text-white"}>
            {captain}
          </span>
        </div>

        <div
          className={`flex items-center justify-between rounded-xl px-4 py-4 ${
            lightMode ? "bg-slate-50" : "bg-white/5"
          }`}
        >
          <span className={lightMode ? "text-slate-600" : "text-slate-300"}>
            Franchise Owner
          </span>
          <span className={lightMode ? "font-medium text-slate-900" : "font-medium text-white"}>
            {owner}
          </span>
        </div>

        <div
          className={`flex items-center justify-between rounded-xl px-4 py-4 ${
            lightMode ? "bg-slate-50" : "bg-white/5"
          }`}
        >
          <span className={lightMode ? "text-slate-600" : "text-slate-300"}>
            Venue
          </span>
          <span className={lightMode ? "font-medium text-slate-900" : "font-medium text-white"}>
            {venue}
          </span>
        </div>
      </div>
    </div>
  );
}