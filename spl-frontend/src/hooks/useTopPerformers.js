import { useCallback, useEffect, useRef, useState } from "react";
import { getTopPerformersContent } from "../api/homeAPI";
import { getApiErrorMessage } from "../utils/apiErrors";

const REFRESH_INTERVAL_MS = 15000;

export default function useTopPerformers() {
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastSnapshotRef = useRef("");

  const loadTopPerformers = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        setError("");
        const data = await getTopPerformersContent();
        const nextPerformers = Array.isArray(data) ? data : [];
        const nextSnapshot = JSON.stringify(nextPerformers);

        if (nextSnapshot !== lastSnapshotRef.current) {
          lastSnapshotRef.current = nextSnapshot;
          setPerformers(nextPerformers);
        }
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to fetch top performers right now."
          )
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTopPerformers();

    const intervalId = window.setInterval(() => {
      loadTopPerformers({ silent: true });
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadTopPerformers({ silent: true });
      }
    };

    const handleWindowFocus = () => {
      loadTopPerformers({ silent: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadTopPerformers]);

  return {
    performers,
    loading,
    error,
    refreshTopPerformers: loadTopPerformers,
  };
}
