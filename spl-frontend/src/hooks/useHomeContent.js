import { useEffect, useRef, useState } from "react";
import { getHomeContent } from "../api/homeAPI";
import { getApiErrorMessage } from "../utils/apiErrors";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../utils/franchiseSync";
import {
  HOME_CONTENT_UPDATED_EVENT,
  HOME_CONTENT_UPDATED_STORAGE_KEY,
} from "../utils/homeContentSync";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../utils/teamSync";

export default function useHomeContent() {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const contentRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchHomeContent({ silent = false } = {}) {
      try {
        if (!silent) {
          setLoading(true);
        }

        const data = await getHomeContent();

        if (isMounted) {
          setError("");
          const nextContent = data && typeof data === "object" ? data : null;
          contentRef.current = nextContent;
          setContent(nextContent);
        }
      } catch (err) {
        if (isMounted) {
          if (!contentRef.current) {
            setError(getApiErrorMessage(err, "Unable to fetch home content."));
          } else {
            setError("");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchHomeContent();

    const handleRefresh = () => {
      fetchHomeContent({ silent: true });
    };

    const handleStorage = (event) => {
      if (
        event.key === TEAMS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY ||
        event.key === HOME_CONTENT_UPDATED_STORAGE_KEY
      ) {
        fetchHomeContent();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchHomeContent({ silent: true });
      }
    };

    window.addEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
    window.addEventListener(HOME_CONTENT_UPDATED_EVENT, handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(HOME_CONTENT_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { content, loading, error };
}
