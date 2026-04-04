import { useEffect, useState } from "react";
import {
  getFranchiseDashboardBudgetTrend,
  getFranchiseDashboardNextMatch,
  getFranchiseDashboardNotices,
  getFranchiseDashboardSquadSummary,
  getFranchiseDashboardSummary,
} from "../api/franchiseAPI";
import { getApiErrorMessage } from "../utils/apiErrors";

const INITIAL_DATA = {
  summary: null,
  nextMatch: null,
  notices: null,
  squadSummary: null,
  budgetTrend: null,
};

export default function useFranchiseDashboard(params = {}, options = {}) {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const paramsKey = JSON.stringify(params || {});
  const enabled = options.enabled !== false;

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setData(INITIAL_DATA);
      setLoading(false);
      setError("");

      return () => {
        isMounted = false;
      };
    }

    async function fetchFranchiseDashboard() {
      try {
        setLoading(true);
        setError("");

        const [summary, nextMatch, notices, squadSummary, budgetTrend] =
          await Promise.all([
            getFranchiseDashboardSummary(params),
            getFranchiseDashboardNextMatch(params),
            getFranchiseDashboardNotices(params),
            getFranchiseDashboardSquadSummary(params),
            getFranchiseDashboardBudgetTrend(params),
          ]);

        if (!isMounted) {
          return;
        }

        setData({
          summary,
          nextMatch,
          notices,
          squadSummary,
          budgetTrend,
        });
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(
          getApiErrorMessage(
            fetchError,
            "Unable to load the franchise dashboard right now."
          )
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchFranchiseDashboard();

    return () => {
      isMounted = false;
    };
  }, [enabled, paramsKey]);

  return {
    ...data,
    loading,
    error,
  };
}
