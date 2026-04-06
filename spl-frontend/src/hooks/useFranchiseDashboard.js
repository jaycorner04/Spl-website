import { useEffect, useMemo, useState } from "react";
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

function getParamsSignature(params) {
  try {
    return JSON.stringify(params || {});
  } catch {
    return "__invalid_params__";
  }
}

export default function useFranchiseDashboard(params = {}, options = {}) {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const paramsSignature = useMemo(() => getParamsSignature(params), [params]);
  const normalizedParams = useMemo(
    () => {
      if (paramsSignature === "__invalid_params__") {
        return {};
      }

      try {
        const parsedParams = JSON.parse(paramsSignature);
        return parsedParams && typeof parsedParams === "object"
          ? parsedParams
          : {};
      } catch {
        return {};
      }
    },
    [paramsSignature]
  );
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
            getFranchiseDashboardSummary(normalizedParams),
            getFranchiseDashboardNextMatch(normalizedParams),
            getFranchiseDashboardNotices(normalizedParams),
            getFranchiseDashboardSquadSummary(normalizedParams),
            getFranchiseDashboardBudgetTrend(normalizedParams),
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
  }, [enabled, normalizedParams]);

  return {
    ...data,
    loading,
    error,
  };
}
