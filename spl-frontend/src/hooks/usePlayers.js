import { useEffect, useState } from "react";
import { getPlayers } from "../api/playersAPI";

export default function usePlayers(filters = {}) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filtersKey = JSON.stringify(filters || {});

  useEffect(() => {
    let isMounted = true;

    async function fetchPlayers() {
      try {
        setLoading(true);
        setError("");

        const data = await getPlayers(JSON.parse(filtersKey));

        if (isMounted) {
          setPlayers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("usePlayers fetch error:", err);

        let message = "Unable to fetch players.";

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

    fetchPlayers();

    return () => {
      isMounted = false;
    };
  }, [filtersKey]);

  return { players, loading, error };
}
