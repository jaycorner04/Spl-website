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
  onAddTeam,
  onEditOwnFranchise,
}) {
  const managedFranchise = isFranchiseAdmin ? filteredFranchises[0] : null;
  const canAddTeam = Boolean(managedFranchise && managedFranchise.slotsLeft > 0);

  return (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Franchise" : "Franchise Registry"}
      bodyClassName="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="text-sm text-slate-500">
          Total results: <span className="font-semibold text-slate-900">{filteredFranchises.length}</span>
        </div>

        {isFranchiseAdmin && managedFranchise ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAddTeam}
              disabled={!canAddTeam}
              className="rounded-xl bg-purple-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-purple-700 transition hover:bg-purple-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {canAddTeam ? "+ Add Team" : "3 Teams Full"}
            </button>

            <button
              type="button"
              onClick={onEditOwnFranchise}
              className="rounded-xl bg-yellow-100 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-yellow-700 transition hover:bg-yellow-200"
            >
              Edit Franchise
            </button>
          </div>
        ) : !isFranchiseAdmin ? (
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
