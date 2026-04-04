import { useEffect, useState } from "react";
import { getHomeContent } from "../api/homeAPI";
import { getApiErrorMessage } from "../utils/apiErrors";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../utils/franchiseSync";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../utils/teamSync";

export default function useHomeContent() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchHomeContent() {
      try {
        setLoading(true);
        setError("");

        const data = await getHomeContent();

        if (isMounted) {
          setContent(data && typeof data === "object" ? data : null);
        }
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Unable to fetch home content."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHomeContent();

    const handleRefresh = () => {
      fetchHomeContent();
    };

    const handleStorage = (event) => {
      if (
        event.key === TEAMS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY
      ) {
        fetchHomeContent();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchHomeContent();
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

  return { content, loading, error };
}
