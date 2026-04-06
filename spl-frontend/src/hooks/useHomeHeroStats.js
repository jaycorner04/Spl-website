import { useEffect, useState } from "react";
import { getFixtures } from "../api/fixturesAPI";
import { getFranchises } from "../api/franchiseAPI";
import { getPlayers } from "../api/playersAPI";
import { getTeams } from "../api/teamsAPI";
import { getApiErrorMessage } from "../utils/apiErrors";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../utils/franchiseSync";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../utils/teamSync";

export default function useHomeHeroStats() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchHeroStats() {
      try {
        setLoading(true);
        setError("");

        const [franchises, players, fixtures, teams] = await Promise.all([
          getFranchises(),
          getPlayers(),
          getFixtures(),
          getTeams(),
        ]);
        const approvedFranchises = Array.isArray(franchises)
          ? franchises.filter((item) => {
              const normalizedStatus = String(item.status || "")
                .trim()
                .toLowerCase();
              return !normalizedStatus || normalizedStatus === "approved";
            })
          : [];

        if (!isMounted) {
          return;
        }

        setStats([
          {
            value: String(
              approvedFranchises.length > 0
                ? approvedFranchises.length
                : Array.isArray(teams)
                ? teams.length
                : 0
            ),
            label: "Franchises",
          },
          {
            value: String(Array.isArray(players) ? players.length : 0),
            label: "Players",
          },
          {
            value: String(Array.isArray(fixtures) ? fixtures.length : 0),
            label: "Matches",
          },
        ]);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setError(
          getApiErrorMessage(error, "Unable to load the home page league stats.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHeroStats();

    const handleRefresh = () => {
      fetchHeroStats();
    };

    const handleStorage = (event) => {
      if (
        event.key === TEAMS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY
      ) {
        fetchHeroStats();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchHeroStats();
      }
    };

    window.addEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { stats, loading, error };
}
