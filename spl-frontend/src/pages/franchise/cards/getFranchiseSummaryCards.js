export function getFranchiseSummaryCards({
  isFranchiseAdmin,
  scopedFranchiseRows,
  franchiseTeamRosterRows,
  activeManagedFranchise,
}) {
  const franchisesWithTeams = scopedFranchiseRows.filter(
    (franchise) => franchise.linkedTeamsCount > 0
  ).length;
  const fullFranchises = scopedFranchiseRows.filter(
    (franchise) => franchise.linkedTeamsCount >= 3
  ).length;
  const totalOpenSlots = scopedFranchiseRows.reduce(
    (sum, franchise) => sum + franchise.slotsLeft,
    0
  );
  const totalManagedPlayers = franchiseTeamRosterRows.reduce(
    (sum, team) => sum + team.roster.length,
    0
  );

  if (isFranchiseAdmin) {
    return [
      {
        label: "My Franchise",
        value: scopedFranchiseRows.length,
        subtext: "Your assigned franchise workspace",
        color: "purple",
        icon: "Fr",
      },
      {
        label: "My Teams",
        value: franchiseTeamRosterRows.length,
        subtext: "Teams currently under your franchise",
        color: "blue",
        icon: "Tm",
      },
      {
        label: "Open Slots",
        value: activeManagedFranchise?.slotsLeft ?? 0,
        subtext: "Remaining team slots you can still use",
        color: "green",
        icon: "Sl",
      },
      {
        label: "My Players",
        value: totalManagedPlayers,
        subtext: "Players currently assigned to your teams",
        color: "orange",
        icon: "Pl",
      },
    ];
  }

  return [
    {
      label: "Total Franchises",
      value: scopedFranchiseRows.length,
      subtext: "Available for super admin control",
      color: "purple",
      icon: "Fr",
    },
    {
      label: "Team Linked",
      value: franchisesWithTeams,
      subtext: "Mapped to one or more teams",
      color: "blue",
      icon: "Ln",
    },
    {
      label: "Open Slots",
      value: totalOpenSlots,
      subtext: "Remaining team slots across franchises",
      color: "green",
      icon: "Sl",
    },
    {
      label: "Full Capacity",
      value: fullFranchises,
      subtext: "Franchises already owning 3 teams",
      color: "orange",
      icon: "3T",
    },
  ];
}
