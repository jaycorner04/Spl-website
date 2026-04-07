import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminShell } from "../api/adminShellAPI";
import { getApiErrorMessage } from "../utils/apiErrors";
import {
  APPROVALS_UPDATED_EVENT,
  APPROVALS_UPDATED_STORAGE_KEY,
} from "../utils/approvalSync";
import {
  FRANCHISES_UPDATED_EVENT,
  FRANCHISES_UPDATED_STORAGE_KEY,
} from "../utils/franchiseSync";
import {
  TEAMS_UPDATED_EVENT,
  TEAMS_UPDATED_STORAGE_KEY,
} from "../utils/teamSync";

const EMPTY_SHELL_DATA = {
  profile: null,
  badges: {},
  notifications: [],
};

export default function useAdminShell() {
  const [shellData, setShellData] = useState(EMPTY_SHELL_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const lastSnapshotRef = useRef(JSON.stringify(EMPTY_SHELL_DATA));

  const loadShell = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await getAdminShell();
      const nextShellData = {
        profile: response?.profile || null,
        badges: response?.badges || {},
        notifications: Array.isArray(response?.notifications)
          ? response.notifications
          : [],
      };
      const nextSnapshot = JSON.stringify(nextShellData);

      if (nextSnapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = nextSnapshot;
        setShellData(nextShellData);
      }
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Unable to load the admin shell data.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShell();
  }, [loadShell]);

  useEffect(() => {
    const intervalId = window.setInterval(loadShell, 15000);

    function handleRefresh() {
      loadShell();
    }

    function handleStorage(event) {
      if (
        event.key === APPROVALS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY ||
        event.key === TEAMS_UPDATED_STORAGE_KEY
      ) {
        loadShell();
      }
    }

    window.addEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
    window.addEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [loadShell]);

  return {
    profile: shellData.profile,
    badges: shellData.badges,
    notifications: shellData.notifications,
    isLoading,
    errorMessage,
    refreshShell: loadShell,
  };
}
