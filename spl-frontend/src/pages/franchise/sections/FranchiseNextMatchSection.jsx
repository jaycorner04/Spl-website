import Badge from "../../../components/common/Badge";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseNextMatchSection({ title, loading, match }) {
  return (
    <DashboardPanel title={title || "Next Match"} bodyClassName="space-y-4">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          Loading next match...
        </div>
      ) : match ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-condensed text-base font-bold uppercase tracking-[0.14em] text-slate-900">
                {match.fixture}
              </p>
              <p className="mt-2 text-sm text-slate-500">{match.venue}</p>
            </div>
            <Badge
              label={match.status || "Upcoming"}
              color={String(match.status || "").toLowerCase() === "live" ? "red" : "blue"}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Match Date</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{match.date || "TBD"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Match Time</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{match.time || "TBD"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            {match.note}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          No next match details are available yet.
        </div>
      )}
    </DashboardPanel>
  );
}
