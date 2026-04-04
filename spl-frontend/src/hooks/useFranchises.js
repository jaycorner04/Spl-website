import { useCallback, useEffect, useState } from "react";
import { getFranchises } from "../api/franchiseAPI";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../utils/franchiseSync";

export default function useFranchises() {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFranchises = useCallback(async (isMountedRef) => {
    try {
      setLoading(true);
      setError("");

      const data = await getFranchises();

      if (isMountedRef.current) {
        setFranchises(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("useFranchises error:", err);

      let message = "Unable to fetch franchises.";

      if (err.code === "ERR_NETWORK") {
        message = "Backend server is not reachable.";
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
    const isMountedRef = { current: true };

    fetchFranchises(isMountedRef);

    const handleFranchisesUpdated = () => {
      fetchFranchises(isMountedRef);
    };

    const handleStorage = (event) => {
      if (event.key === FRANCHISES_UPDATED_STORAGE_KEY) {
        fetchFranchises(isMountedRef);
      }
    };

    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleFranchisesUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        FRANCHISES_UPDATED_EVENT,
        handleFranchisesUpdated
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchFranchises]);

  return { franchises, loading, error };
}
