import FranchiseTeamsPlayersSection from "../../sections/FranchiseTeamsPlayersSection";

export default function PlayerInformationSection({
  isFranchiseAdmin,
  activeManagedFranchise,
  franchiseTeamRosterRows,
  playingXiLimit,
  updatingPlayerIds,
  onAddTeam,
  onSetPlayerSquadRole,
}) {
  return (
    <div className="space-y-6">
      <FranchiseTeamsPlayersSection
        isFranchiseAdmin={isFranchiseAdmin}
        activeManagedFranchise={activeManagedFranchise}
        franchiseTeamRosterRows={franchiseTeamRosterRows}
        playingXiLimit={playingXiLimit}
        updatingPlayerIds={updatingPlayerIds}
        onAddTeam={onAddTeam}
        onSetPlayerSquadRole={onSetPlayerSquadRole}
      />
    </div>
  );
}
