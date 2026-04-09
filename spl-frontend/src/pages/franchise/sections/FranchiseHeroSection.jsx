import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseHeroSection({ title, loading, context }) {
  return (
    <DashboardPanel title={title || "Franchise Dashboard"} bodyClassName="space-y-4">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          Loading franchise dashboard...
        </div>
      ) : context ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5">
            <p className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-purple-700">
              Active Franchise
            </p>
            <h2 className="mt-2 font-heading text-3xl leading-none text-slate-900">
              {context.franchiseName || "Assigned Franchise"}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Team: <span className="font-semibold text-slate-900">{context.teamName || "Not linked yet"}</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {[context.city, context.venue].filter(Boolean).join(" | ") ||
                "Venue details will appear here once linked."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {context.ownerName || "Not assigned"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Website</p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                {context.website || "Not available"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          No franchise dashboard data is available yet.
        </div>
      )}
    </DashboardPanel>
  );
}
