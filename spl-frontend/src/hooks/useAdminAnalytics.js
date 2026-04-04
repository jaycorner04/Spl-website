import { useCallback, useEffect, useState } from "react";
import { getAdminAnalytics } from "../api/adminAnalyticsAPI";
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

const EMPTY_ANALYTICS = {
  kpis: [],
  runsByTeam: [],
  roleDistribution: [],
  budgetByTeam: [],
  matchStatusOverview: [],
  insights: [],
};

export default function useAdminAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(EMPTY_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getAdminAnalytics();
      setAnalyticsData({
        ...EMPTY_ANALYTICS,
        ...response,
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Unable to load admin analytics.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const handleRefresh = () => {
      loadAnalytics();
    };

    const handleStorage = (event) => {
      if (
        event.key === APPROVALS_UPDATED_STORAGE_KEY ||
        event.key === FRANCHISES_UPDATED_STORAGE_KEY ||
        event.key === TEAMS_UPDATED_STORAGE_KEY
      ) {
        loadAnalytics();
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
  }, [loadAnalytics]);

  return {
    analyticsData,
    errorMessage,
    isLoading,
    refreshAnalytics: loadAnalytics,
  };
}
