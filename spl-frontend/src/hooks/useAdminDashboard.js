import { useCallback, useEffect, useState } from "react";
import { getAdminDashboard } from "../api/adminDashboardAPI";
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

const EMPTY_DASHBOARD = {
  stats: [],
  pointsTableRows: [],
  seasonProgress: [],
  liveNow: null,
  franchiseOverview: [],
  recentActivities: [],
  topPerformers: [],
};

export default function useAdminDashboard() {
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getAdminDashboard();
      setDashboardData({
        ...EMPTY_DASHBOARD,
        ...response,
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Unable to load the super admin dashboard.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const handleRefresh = () => {
      loadDashboard();
    };

    const handleStorage = (event) => {
      if (
        event.key === APPROVALS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY ||
        event.key === TEAMS_UPDATED_STORAGE_KEY
      ) {
        loadDashboard();
      }
    };

    window.addEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
    window.addEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
    window.addEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener(APPROVALS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(FRANCHISES_UPDATED_EVENT, handleRefresh);
      window.removeEventListener(TEAMS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [loadDashboard]);

  return {
    dashboardData,
    errorMessage,
    isLoading,
    refreshDashboard: loadDashboard,
  };
}
