import Badge from "../../../components/common/Badge";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseNoticesSection({
  title,
  loading,
  items,
  getNoticeColor,
}) {
  return (
    <DashboardPanel title={title || "Notices"} bodyClassName="space-y-3">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          Loading notices...
        </div>
      ) : Array.isArray(items) && items.length > 0 ? (
        items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-xs text-slate-500">{item.date}</p>
              </div>
              <Badge label={item.type || "Notice"} color={getNoticeColor(item.type)} />
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          No notices are available yet.
        </div>
      )}
    </DashboardPanel>
  );
}
