import { useCallback, useEffect, useState } from "react";
import { getPlayers } from "../api/playersAPI";
import {
  PLAYERS_UPDATED_EVENT,
  PLAYERS_UPDATED_STORAGE_KEY,
} from "../utils/playerSync";

export default function usePlayers(filters = {}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filtersKey = JSON.stringify(filters || {});

  const fetchPlayers = useCallback(async (isMountedRef) => {
    try {
      setLoading(true);
      setError("");

      const data = await getPlayers(JSON.parse(filtersKey));

      if (isMountedRef.current) {
        setPlayers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("usePlayers fetch error:", err);

      let message = "Unable to fetch players.";

      if (err.code === "ERR_NETWORK") {
        message =
          "Backend server is not reachable. Please check the API server.";
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.message) {
        message = err.message;
      }

      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filtersKey]);

  useEffect(() => {
    const isMountedRef = { current: true };

    fetchPlayers(isMountedRef);

    const handlePlayersUpdated = () => {
      fetchPlayers(isMountedRef);
    };

    const handleStorage = (event) => {
      if (event.key === PLAYERS_UPDATED_STORAGE_KEY) {
        fetchPlayers(isMountedRef);
      }
    };

    window.addEventListener(PLAYERS_UPDATED_EVENT, handlePlayersUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(PLAYERS_UPDATED_EVENT, handlePlayersUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchPlayers]);

  return { players, loading, error };
}
