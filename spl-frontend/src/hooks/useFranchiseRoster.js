import { useEffect, useState } from "react";
import { getPlayers } from "../api/playersAPI";
import { getTeams } from "../api/teamsAPI";
import { getApiErrorMessage } from "../utils/apiErrors";

const INITIAL_DATA = {
  teams: [],
  totalPlayers: 0,
  playingXiCount: 0,
  reserveCount: 0,
};

export default function useFranchiseRoster(franchiseId, options = {}) {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const enabled = options.enabled !== false && Number(franchiseId) > 0;

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setData(INITIAL_DATA);
      setLoading(false);
      setError("");
      return () => {
        isMounted = false;
      };
    }

    async function fetchRoster() {
      try {
        setLoading(true);
        setError("");

        const scopedTeams = await getTeams({ franchiseId });
        const teams = Array.isArray(scopedTeams) ? scopedTeams : [];

        const rosters = await Promise.all(
          teams.map(async (team) => {
            const players = await getPlayers({ teamId: team.id });
            const roster = Array.isArray(players)
              ? [...players].sort((left, right) =>
                  String(left.full_name || "").localeCompare(
                    String(right.full_name || "")
                  )
                )
              : [];

            return {
              ...team,
              roster,
              playingXi: roster.filter(
                (player) =>
                  String(player.squad_role || "").toLowerCase() ===
                  "playing xi"
              ),
              reservePlayers: roster.filter(
                (player) =>
                  String(player.squad_role || "").toLowerCase() !==
                  "playing xi"
              ),
            };
          })
        );

        if (!isMounted) {
          return;
        }

        const allPlayers = rosters.flatMap((team) => team.roster);

        setData({
          teams: rosters,
          totalPlayers: allPlayers.length,
          playingXiCount: rosters.reduce(
            (total, team) => total + team.playingXi.length,
            0
          ),
          reserveCount: rosters.reduce(
            (total, team) => total + team.reservePlayers.length,
            0
          ),
        });
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setData(INITIAL_DATA);
        setError(
          getApiErrorMessage(
            fetchError,
            "Unable to load the franchise team roster right now."
          )
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRoster();

    return () => {
      isMounted = false;
    };
  }, [enabled, franchiseId]);

  return {
    ...data,
    loading,
    error,
  };
}
