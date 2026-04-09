import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseNotesSection({
  isFranchiseAdmin,
  franchiseTeamRosterRows,
  scopedFranchiseRows,
  activeManagedFranchise,
}) {
  return (
    <DashboardPanel title={isFranchiseAdmin ? "My Franchise Notes" : "Quick Notes"}>
      <div className="space-y-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-600">
            {isFranchiseAdmin
              ? `${franchiseTeamRosterRows.length} team${
                  franchiseTeamRosterRows.length === 1 ? "" : "s"
                } are linked under your franchise`
              : `${scopedFranchiseRows.filter((franchise) => franchise.linkedTeamsCount > 0).length} franchises are already linked`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isFranchiseAdmin
              ? "This area tracks only the teams and players managed inside your franchise workspace."
              : "Linked franchises help the super admin track ownership and branding in one place."}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-700">
            {isFranchiseAdmin
              ? activeManagedFranchise?.hasLogo
                ? "Your franchise logo is already uploaded"
                : "Your franchise still needs a logo"
              : `${scopedFranchiseRows.filter((franchise) => !franchise.hasLogo).length} franchises still need logos`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isFranchiseAdmin
              ? "Once approved, your franchise logo can appear on the public franchise section when a team logo is not set."
              : "Uploaded franchise logos can appear on the public franchise section when a team logo is not set."}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-600">
            {isFranchiseAdmin
              ? `You can manage up to 3 teams under ${activeManagedFranchise?.company_name || "your franchise"}`
              : "One franchise can own up to 3 teams"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isFranchiseAdmin
              ? "Your team limit is enforced here, and any teams or players you add will stay under your franchise."
              : "The admin teams form now enforces this limit and the linked team details update live here."}
          </p>
        </div>
      </div>
    </DashboardPanel>
  );
}
