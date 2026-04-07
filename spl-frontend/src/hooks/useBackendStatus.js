import { useCallback, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "../api/axiosConfig";

const HEALTH_CHECK_INTERVAL_MS = 15000;

function buildHealthCheckUrl() {
  return buildApiUrl("/api/health/");
}

export default function useBackendStatus() {
  const healthCheckUrl = useMemo(() => buildHealthCheckUrl(), []);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  const checkBackend = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsChecking((current) => (current ? current : true));
      }

      try {
        const response = await fetch(healthCheckUrl, {
          method: "GET",
          cache: "no-store",
        });

        setIsBackendReachable((current) =>
          current === response.ok ? current : response.ok
        );
      } catch {
        setIsBackendReachable((current) => (current ? false : current));
      } finally {
        setIsChecking((current) => (current ? false : current));
      }
    },
    [healthCheckUrl]
  );

  useEffect(() => {
    checkBackend();

    const intervalId = window.setInterval(() => {
      checkBackend({ silent: true });
    }, HEALTH_CHECK_INTERVAL_MS);

    const handleOnline = () => {
      checkBackend({ silent: true });
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkBackend]);

  return {
    isBackendReachable,
    isChecking,
    retry: () => checkBackend(),
  };
}
