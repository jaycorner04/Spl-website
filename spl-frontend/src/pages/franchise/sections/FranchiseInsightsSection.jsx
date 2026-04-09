import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseInsightsSection({
  loading,
  squadSummary,
  budgetTrend,
  getBudgetBarColorClass,
  formatDashboardLakhs,
}) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <DashboardPanel title={squadSummary?.title || "Squad Summary"} bodyClassName="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading squad summary...
          </div>
        ) : Array.isArray(squadSummary?.items) && squadSummary.items.length > 0 ? (
          squadSummary.items.map((item, index, items) => {
            const maxValue = Math.max(...items.map((entry) => Number(entry.value || 0)), 1);
            const width = `${Math.max((Number(item.value || 0) / maxValue) * 100, 8)}%`;

            return (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">{item.name}</span>
                  <span className="font-condensed text-sm font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={getBudgetBarColorClass(index)} style={{ width, height: "100%" }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No squad summary is available yet.
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title={budgetTrend?.title || "Budget Trend"} bodyClassName="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading budget trend...
          </div>
        ) : budgetTrend ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total Purse</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDashboardLakhs(budgetTrend.totalPurse)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Spent</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDashboardLakhs(budgetTrend.spent)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Remaining</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDashboardLakhs(budgetTrend.remaining)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {(budgetTrend.items || []).map((item, index, items) => {
                const maxAmount = Math.max(...items.map((entry) => Number(entry.amount || 0)), 1);
                const width = `${Math.max((Number(item.amount || 0) / maxAmount) * 100, 8)}%`;

                return (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">{item.name}</span>
                      <span className="font-condensed text-sm font-bold text-slate-900">
                        {formatDashboardLakhs(item.amount)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={getBudgetBarColorClass(index)} style={{ width, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            No budget trend is available yet.
          </div>
        )}
      </DashboardPanel>
    </section>
  );
}
