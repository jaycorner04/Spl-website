import { useEffect, useState } from "react";
import { getVenues } from "../api/venuesAPI";

export default function useVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchVenues() {
      try {
        setLoading(true);
        setError("");

        const data = await getVenues();

        if (isMounted) {
          setVenues(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("useVenues fetch error:", err);

        let message = "Unable to fetch venues.";

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

    fetchVenues();

    return () => {
      isMounted = false;
    };
  }, []);

  return { venues, loading, error };
}   