import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseSnapshotSection({
  isFranchiseAdmin,
  franchiseTeamRosterRows,
  snapshotFranchises,
}) {
  return (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Teams Snapshot" : "Linked Team Snapshot"}
      actionLabel={
        isFranchiseAdmin
          ? `${franchiseTeamRosterRows.length} teams`
          : `${snapshotFranchises.length} franchises`
      }
    >
      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {isFranchiseAdmin ? (
          franchiseTeamRosterRows.length === 0 ? (
            <p className="text-sm text-slate-500">No teams are linked under your franchise yet.</p>
          ) : (
            franchiseTeamRosterRows.map((team) => (
              <div key={team.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{team.team_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {[team.city, team.owner, team.captain].filter(Boolean).join(" | ") ||
                        "Team details available in your roster section"}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-purple-700">{team.roster.length} players</span>
                </div>
              </div>
            ))
          )
        ) : snapshotFranchises.length === 0 ? (
          <p className="text-sm text-slate-500">No franchises available.</p>
        ) : (
          snapshotFranchises.map((franchise) => (
            <div key={franchise.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{franchise.company_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{franchise.linkedTeamsLabel}</p>
                </div>

                <span className="text-sm font-semibold text-purple-700">
                  {franchise.teamCapacityLabel} teams
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardPanel>
  );
}
