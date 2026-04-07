import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveMatch } from "../api/liveMatchAPI";
import { getApiErrorMessage } from "../utils/apiErrors";
import { defaultLiveMatchState } from "../utils/liveMatchStore";

export default function useLiveMatch(refreshInterval = 15000) {
  const [liveMatch, setLiveMatch] = useState(defaultLiveMatchState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastSnapshotRef = useRef(JSON.stringify(defaultLiveMatchState));

  const loadLiveMatch = useCallback(async () => {
    try {
      const response = await getLiveMatch();
      const nextLiveMatch = {
        ...defaultLiveMatchState,
        ...(response || {}),
      };
      const nextSnapshot = JSON.stringify(nextLiveMatch);

      if (nextSnapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = nextSnapshot;
        setLiveMatch(nextLiveMatch);
      }
      setError("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load live match data.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveMatch();
  }, [loadLiveMatch]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval < 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadLiveMatch();
    }, refreshInterval);

    return () => window.clearInterval(intervalId);
  }, [loadLiveMatch, refreshInterval]);

  useEffect(() => {
    const handleFocus = () => {
      loadLiveMatch();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadLiveMatch]);

  return {
    liveMatch,
    loading,
    error,
    refreshLiveMatch: loadLiveMatch,
  };
}
