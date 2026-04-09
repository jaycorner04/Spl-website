import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import DataTable from "../../../components/dashboard/DataTable";
import ExportButton from "../../../components/dashboard/ExportButton";

export default function FranchiseRegistrySection({
  isFranchiseAdmin,
  filteredFranchises,
  scopedFranchiseId,
  loading,
  columns,
  onAdd,
  onExport,
  onEditOwnFranchise,
}) {
  return (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Franchise" : "Franchise Registry"}
      actionLabel={
        isFranchiseAdmin
          ? filteredFranchises[0]
            ? "Edit My Franchise"
            : undefined
          : undefined
      }
      onAction={isFranchiseAdmin && filteredFranchises[0] ? onEditOwnFranchise : undefined}
      bodyClassName="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="text-sm text-slate-500">
          Total results: <span className="font-semibold text-slate-900">{filteredFranchises.length}</span>
        </div>

        {!isFranchiseAdmin ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl bg-purple-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-purple-700 transition hover:bg-purple-200"
            >
              + Add Franchise
            </button>

            <ExportButton label="Export Franchises" onClick={onExport} />
          </div>
        ) : null}
      </div>

      {isFranchiseAdmin && !scopedFranchiseId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No franchise is linked to this account yet. Once your franchise is assigned, only your owned franchise and teams will appear here.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
          Loading franchises...
        </div>
      ) : (
        <div className="max-h-[34rem] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          <DataTable
            columns={columns}
            data={filteredFranchises}
            rowKey="id"
            emptyMessage={
              isFranchiseAdmin
                ? "No franchise is linked to this account yet."
                : "No franchises match the selected filters."
            }
          />
        </div>
      )}
    </DashboardPanel>
  );
}
