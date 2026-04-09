import FranchiseSnapshotSection from "../../sections/FranchiseSnapshotSection";

export default function TeamsSection({
  isFranchiseAdmin,
  franchiseTeamRosterRows,
  snapshotFranchises,
}) {
  return (
    <div className="space-y-6">
      <FranchiseSnapshotSection
        isFranchiseAdmin={isFranchiseAdmin}
        franchiseTeamRosterRows={franchiseTeamRosterRows}
        snapshotFranchises={snapshotFranchises}
      />
    </div>
  );
}
