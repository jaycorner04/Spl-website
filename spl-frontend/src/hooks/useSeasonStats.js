import { useEffect, useState } from "react";
import { getFixtures } from "../api/fixturesAPI";
import { getPerformances } from "../api/performancesAPI";
import { getPlayers } from "../api/playersAPI";
import { getApiErrorMessage } from "../utils/apiErrors";

const FALLBACK_STATS = [
  { label: "Total Matches", value: "56" },
  { label: "Total Runs", value: "8,420" },
  { label: "Total Wickets", value: "412" },
  { label: "Sixes", value: "286" },
  { label: "Fours", value: "714" },
  { label: "Fans Engaged", value: "12K+" },
];

const numberFormatter = new Intl.NumberFormat("en-IN");

function toNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatWholeNumber(value) {
  return numberFormatter.format(Math.max(0, Math.round(toNumber(value))));
}

function formatFansEngaged(value) {
  const safeValue = Math.max(0, Math.round(toNumber(value)));

  if (safeValue >= 1000) {
    const compactValue = safeValue / 1000;
    const roundedValue =
      compactValue >= 10
        ? Math.round(compactValue)
        : Math.round(compactValue * 10) / 10;

    return `${roundedValue}K+`;
  }

  return formatWholeNumber(safeValue);
}

function buildSeasonStats(fixtures, players, performances) {
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const safePlayers = Array.isArray(players) ? players : [];
  const safePerformances = Array.isArray(performances) ? performances : [];

  const totals = safePerformances.reduce(
    (summary, performance) => ({
      runs: summary.runs + toNumber(performance?.runs),
      wickets: summary.wickets + toNumber(performance?.wickets),
      sixes: summary.sixes + toNumber(performance?.sixes),
      fours: summary.fours + toNumber(performance?.fours),
    }),
    { runs: 0, wickets: 0, sixes: 0, fours: 0 }
  );

  const fansEngaged = safePlayers.length * 80;

  return [
    { label: "Total Matches", value: formatWholeNumber(safeFixtures.length) },
    { label: "Total Runs", value: formatWholeNumber(totals.runs) },
    { label: "Total Wickets", value: formatWholeNumber(totals.wickets) },
    { label: "Sixes", value: formatWholeNumber(totals.sixes) },
    { label: "Fours", value: formatWholeNumber(totals.fours) },
    { label: "Fans Engaged", value: formatFansEngaged(fansEngaged) },
  ];
}

export default function useSeasonStats() {
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchSeasonStats() {
      try {
        setLoading(true);
        setError("");

        const [fixtures, players, performances] = await Promise.all([
          getFixtures(),
          getPlayers(),
          getPerformances(),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(buildSeasonStats(fixtures, players, performances));
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }

        setError(
          getApiErrorMessage(fetchError, "Unable to load the season stats.")
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSeasonStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return { stats, loading, error };
}
