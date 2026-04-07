import { useCallback, useEffect, useState } from "react";
import { getTeams } from "../api/teamsAPI";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../utils/teamSync";

export default function useTeams(options = {}) {
  const { enabled = true, initialData = [] } = options;
  const [teams, setTeams] = useState(
    Array.isArray(initialData) ? initialData : []
  );
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  const fetchTeams = useCallback(async (isMountedRef) => {
    try {
      setLoading(true);
      setError("");

      const data = await getTeams();

      if (isMountedRef.current) {
        setTeams(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("useTeams fetch error:", err);

      let message = "Unable to fetch teams.";

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
  }, []);

  useEffect(() => {
    if (!enabled) {
      setTeams(Array.isArray(initialData) ? initialData : []);
      setLoading(false);
      setError("");
      return undefined;
    }

    const isMountedRef = { current: true };

    fetchTeams(isMountedRef);

    const handleTeamsUpdated = () => {
      fetchTeams(isMountedRef);
    };

    const handleStorage = (event) => {
      if (event.key === TEAMS_UPDATED_STORAGE_KEY) {
        fetchTeams(isMountedRef);
      }
    };

    window.addEventListener(TEAMS_UPDATED_EVENT, handleTeamsUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleTeamsUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, fetchTeams, initialData]);

  return { teams, loading, error };
}
