import DashboardPanel from "../../../components/dashboard/DashboardPanel";

export default function FranchiseTeamsPlayersSection({
  isFranchiseAdmin,
  activeManagedFranchise,
  franchiseTeamRosterRows,
  playingXiLimit,
  updatingPlayerIds,
  onAddTeam,
  onSetPlayerSquadRole,
}) {
  return (
    <DashboardPanel
      title={isFranchiseAdmin ? "My Teams & Players" : "Franchise Teams & Players"}
      actionLabel={
        isFranchiseAdmin
          ? activeManagedFranchise?.slotsLeft > 0
            ? "+ Add Team"
            : undefined
          : `${franchiseTeamRosterRows.length} teams`
      }
      onAction={
        isFranchiseAdmin && activeManagedFranchise?.slotsLeft > 0 ? onAddTeam : undefined
      }
      bodyClassName="space-y-4"
    >
      {isFranchiseAdmin && activeManagedFranchise ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-purple-900">
              {franchiseTeamRosterRows.length} team
              {franchiseTeamRosterRows.length === 1 ? "" : "s"} under your franchise
            </p>
            <p className="mt-1">
              You can add teams directly from here and build their player squads without opening Edit Franchise.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-purple-700">
            {activeManagedFranchise.teamCapacityLabel} used
          </span>
        </div>
      ) : null}

      {franchiseTeamRosterRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
          No team squads are linked to this franchise yet.
        </div>
      ) : (
        <div className="max-h-[42rem] space-y-4 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          {franchiseTeamRosterRows.map((team) => {
            const playingXiFull = team.playingXi.length >= playingXiLimit;

            return (
              <div key={team.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                      {team.team_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {team.city || "City not set"} | {team.venue || "Venue not set"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      Playing XI: {team.playingXi.length}/{playingXiLimit}
                    </span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Reserves: {team.reservePlayers.length}
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                      Total Squad: {team.roster.length}
                    </span>
                  </div>
                </div>

                {team.playingXi.length !== playingXiLimit ? (
                  <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                    This team currently has {team.playingXi.length} players in the Playing XI. Keep exactly {playingXiLimit} players there and use Reserve players for swaps.
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-blue-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-condensed text-sm uppercase tracking-[0.16em] text-blue-800">Playing XI</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Keep exactly {playingXiLimit} active players here for match day.
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {team.playingXi.length}/{playingXiLimit}
                      </span>
                    </div>

                    {team.playingXi.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No Playing XI selected yet.
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                        {team.playingXi.map((player, index) => {
                          const isUpdating = updatingPlayerIds.includes(String(player.id));

                          return (
                            <div key={player.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {index + 1}. {player.full_name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {player.role || "Player"} | {player.batting_style || "Right Hand"} | {player.bowling_style || "Not listed"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onSetPlayerSquadRole(team, player, "Reserve")}
                                  disabled={isUpdating}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating ? "Updating..." : "Move to Reserve"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-condensed text-sm uppercase tracking-[0.16em] text-purple-800">Reserve Players</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Keep extra players here so you can swap them into the Playing XI anytime.
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                        {team.reservePlayers.length} bench
                      </span>
                    </div>

                    {team.reservePlayers.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        No reserve players added yet for this team.
                      </div>
                    ) : (
                      <div className="mt-4 max-h-[20rem] space-y-3 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                        {team.reservePlayers.map((player) => {
                          const isUpdating = updatingPlayerIds.includes(String(player.id));
                          const promoteDisabled = isUpdating || playingXiFull;

                          return (
                            <div key={player.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{player.full_name}</p>
                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {player.role || "Player"} | {player.batting_style || "Right Hand"} | {player.bowling_style || "Not listed"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onSetPlayerSquadRole(team, player, "Playing XI")}
                                  disabled={promoteDisabled}
                                  className="rounded-xl bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdating
                                    ? "Updating..."
                                    : playingXiFull
                                    ? "Playing XI Full"
                                    : "Promote to XI"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardPanel>
  );
}
