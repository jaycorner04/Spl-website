import { useEffect, useState } from "react";
import { getFixtures } from "../api/fixturesAPI";

export default function useFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchFixtures() {
      try {
        setLoading(true);
        setError("");

        const data = await getFixtures();

        if (isMounted) {
          setFixtures(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("useFixtures fetch error:", err);

        let message = "Unable to fetch fixtures.";

        if (err.code === "ERR_NETWORK") {
          message =
            "Backend server is not reachable. Please check the API server.";
        } else if (err.response?.data?.detail) {
          message = err.response.data.detail;
        } else if (err.message) {
          message = err.message;
        }

        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchFixtures();

    return () => {
      isMounted = false;
    };
  }, []);

  return { fixtures, loading, error };
}
