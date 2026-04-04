import { useEffect, useMemo, useRef, useState } from "react";
import { getLiveMatch, updateLiveMatch } from "../../api/liveMatchAPI";
import AccessLimitedNotice from "../../components/common/AccessLimitedNotice";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { defaultLiveMatchState } from "../../utils/liveMatchStore";

const dismissalOptions = [
  "Bowled",
  "Caught",
  "LBW",
  "Run Out",
  "Stumped",
  "Hit Wicket",
];

function getStrikeRate(runs, balls) {
  if (!balls) return "0.00";
  return ((runs / balls) * 100).toFixed(2);
}

function getEconomy(runs, overs, balls) {
  const totalBalls = overs * 6 + balls;
  if (!totalBalls) return "0.00";
  return ((runs * 6) / totalBalls).toFixed(2);
}

function getOversDisplay(overs, balls) {
  return `${overs}.${balls}`;
}

function getTotalBalls(overs, balls) {
  return overs * 6 + balls;
}

function getCrr(score, overs, balls) {
  const totalBalls = getTotalBalls(overs, balls);
  if (!totalBalls) return "0.00";
  return ((score * 6) / totalBalls).toFixed(2);
}

function getRrr(target, score, overs, balls, maxOvers = 20) {
  const totalBallsFaced = getTotalBalls(overs, balls);
  const totalBallsAvailable = maxOvers * 6;
  const ballsLeft = totalBallsAvailable - totalBallsFaced;
  const runsNeeded = target - score;

  if (runsNeeded <= 0) return "0.00";
  if (ballsLeft <= 0) return "-";
  return ((runsNeeded * 6) / ballsLeft).toFixed(2);
}

function getProjectedScore(score, overs, balls, maxOvers = 20) {
  const crr = Number(getCrr(score, overs, balls));
  return Math.round(crr * maxOvers);
}

function PlayerMiniCard({
  player,
  isStriker = false,
  onMakeStriker,
  readonly = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isStriker
          ? "border-yellow-300 bg-yellow-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-condensed text-lg uppercase tracking-[0.08em] text-slate-900">
              {player.name}
            </h3>
            <span className="rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
              {player.role}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {isStriker ? "On Strike" : "Non-Striker"}
          </p>
        </div>

        {isStriker ? (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-yellow-700">
            Active
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 border border-slate-200">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Runs
          </p>
          <p className="mt-1 font-heading text-3xl text-yellow-600">
            {player.runs}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 border border-slate-200">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Balls
          </p>
          <p className="mt-1 font-heading text-3xl text-slate-900">
            {player.balls}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 border border-slate-200">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            4s / 6s
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {player.fours} / {player.sixes}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 border border-slate-200">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Strike Rate
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            {getStrikeRate(player.runs, player.balls)}
          </p>
        </div>
      </div>

      {!readonly && !isStriker ? (
        <button
          type="button"
          onClick={onMakeStriker}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Make Striker
        </button>
      ) : null}
    </div>
  );
}

function SmallStatCard({ label, value, subtext, color = "yellow" }) {
  const colorMap = {
    yellow: "text-yellow-600",
    blue: "text-blue-500",
    green: "text-emerald-500",
    red: "text-red-500",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-heading text-4xl ${colorMap[color]}`}>
        {value}
      </p>
      {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
    </div>
  );
}

export default function LiveMatchControlPage() {
  const initialState = defaultLiveMatchState;
  const skipNextSaveRef = useRef(true);
  const saveTimeoutRef = useRef(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(0);

  const [matchTitle, setMatchTitle] = useState(initialState.matchTitle);
  const [venue, setVenue] = useState(initialState.venue);
  const [battingTeam, setBattingTeam] = useState(initialState.battingTeam);
  const [bowlingTeam, setBowlingTeam] = useState(initialState.bowlingTeam);
  const [score, setScore] = useState(initialState.score);
  const [wickets, setWickets] = useState(initialState.wickets);
  const [overs, setOvers] = useState(initialState.overs);
  const [balls, setBalls] = useState(initialState.balls);
  const [target, setTarget] = useState(initialState.target);
  const [batters, setBatters] = useState(initialState.batters);
  const [bowler, setBowler] = useState(initialState.bowler);
  const [strikerId, setStrikerId] = useState(initialState.strikerId);
  const [nonStrikerId, setNonStrikerId] = useState(initialState.nonStrikerId);
  const [ballHistory, setBallHistory] = useState(initialState.ballHistory);
  const [currentOverBalls, setCurrentOverBalls] = useState(
    initialState.currentOverBalls
  );
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [matchPaused, setMatchPaused] = useState(false);

  const [correctionForm, setCorrectionForm] = useState({
    score: "",
    wickets: "",
    overs: "",
    balls: "",
    target: "",
    strikerRuns: "",
    strikerBalls: "",
    strikerFours: "",
    strikerSixes: "",
    nonStrikerRuns: "",
    nonStrikerBalls: "",
    nonStrikerFours: "",
    nonStrikerSixes: "",
    bowlerRuns: "",
    bowlerWickets: "",
    bowlerOvers: "",
    bowlerBalls: "",
  });

  const striker = batters.find((player) => player.id === strikerId);
  const nonStriker = batters.find((player) => player.id === nonStrikerId);

  const nextBatters = batters.filter(
    (player) => player.status === "yet_to_bat"
  );

  const crr = getCrr(score, overs, balls);
  const rrr = getRrr(target, score, overs, balls);
  const projectedScore = getProjectedScore(score, overs, balls);

  const totalRunsNeeded = Math.max(target - score, 0);
  const totalBallsLeft = 120 - getTotalBalls(overs, balls);

  const applyLiveMatchState = (nextState = {}) => {
    const resolvedState = {
      ...defaultLiveMatchState,
      ...(nextState || {}),
    };

    setMatchTitle(resolvedState.matchTitle || defaultLiveMatchState.matchTitle);
    setVenue(resolvedState.venue || defaultLiveMatchState.venue);
    setBattingTeam(resolvedState.battingTeam || defaultLiveMatchState.battingTeam);
    setBowlingTeam(resolvedState.bowlingTeam || defaultLiveMatchState.bowlingTeam);
    setScore(Number(resolvedState.score || 0));
    setWickets(Number(resolvedState.wickets || 0));
    setOvers(Number(resolvedState.overs || 0));
    setBalls(Number(resolvedState.balls || 0));
    setTarget(Number(resolvedState.target || 0));
    setBatters(
      Array.isArray(resolvedState.batters)
        ? resolvedState.batters
        : defaultLiveMatchState.batters
    );
    setBowler(resolvedState.bowler || defaultLiveMatchState.bowler);
    setStrikerId(Number(resolvedState.strikerId || 0));
    setNonStrikerId(Number(resolvedState.nonStrikerId || 0));
    setBallHistory(
      Array.isArray(resolvedState.ballHistory)
        ? resolvedState.ballHistory
        : defaultLiveMatchState.ballHistory
    );
    setCurrentOverBalls(
      Array.isArray(resolvedState.currentOverBalls)
        ? resolvedState.currentOverBalls
        : defaultLiveMatchState.currentOverBalls
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function loadLiveState() {
      try {
        const remoteState = await getLiveMatch();

        if (!isMounted) {
          return;
        }

        skipNextSaveRef.current = true;
        applyLiveMatchState(remoteState);
        setLastSavedAt(Number(remoteState?.updatedAt || 0));
        setLoadError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          getApiErrorMessage(error, "Unable to load the live match control feed.")
        );
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    loadLiveState();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const liveMatchPayload = useMemo(
    () => ({
      matchTitle,
      venue,
      battingTeam,
      bowlingTeam,
      score,
      wickets,
      overs,
      balls,
      target,
      strikerId,
      nonStrikerId,
      batters,
      bowler,
      currentOverBalls,
      ballHistory,
    }),
    [
      matchTitle,
      venue,
      battingTeam,
      bowlingTeam,
      score,
      wickets,
      overs,
      balls,
      target,
      strikerId,
      nonStrikerId,
      batters,
      bowler,
      currentOverBalls,
      ballHistory,
    ]
  );

  useEffect(() => {
    if (initialLoading) {
      return undefined;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const savedState = await updateLiveMatch(liveMatchPayload);
        setSaveError("");
        setLastSavedAt(Number(savedState?.updatedAt || Date.now()));
      } catch (error) {
        setSaveError(
          getApiErrorMessage(error, "Unable to sync live match updates.")
        );
      }
    }, 450);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [initialLoading, liveMatchPayload]);

  const rotateStrike = () => {
    setStrikerId(nonStrikerId);
    setNonStrikerId(strikerId);
  };

  const pushBallToOver = (value) => {
    setCurrentOverBalls((prev) => {
      const updated = [...prev, value];
      return updated.length > 6 ? updated.slice(updated.length - 6) : updated;
    });
  };

  const advanceLegalBall = () => {
    setBalls((prevBalls) => {
      if (prevBalls === 5) {
        setOvers((prevOvers) => prevOvers + 1);
        setCurrentOverBalls([]);
        setBowler((prev) => {
          let updatedBalls = prev.balls + 1;
          let updatedOvers = prev.overs;

          if (updatedBalls === 6) {
            updatedOvers += 1;
            updatedBalls = 0;
          }

          return {
            ...prev,
            overs: updatedOvers,
            balls: updatedBalls,
          };
        });

        setStrikerId(nonStrikerId);
        setNonStrikerId(strikerId);

        return 0;
      }

      setBowler((prev) => {
        let updatedBalls = prev.balls + 1;
        let updatedOvers = prev.overs;

        if (updatedBalls === 6) {
          updatedOvers += 1;
          updatedBalls = 0;
        }

        return {
          ...prev,
          overs: updatedOvers,
          balls: updatedBalls,
        };
      });

      return prevBalls + 1;
    });
  };

  const addHistory = (label, text, nextBallNumber) => {
    setBallHistory((prev) => [
      {
        over: `${overs}.${nextBallNumber}`,
        result: label,
        text,
      },
      ...prev,
    ]);
  };

  const handleRuns = (runs) => {
    if (matchPaused || !striker) return;

    const nextBallNumber = balls + 1;

    setScore((prev) => prev + runs);

    setBatters((prev) =>
      prev.map((player) => {
        if (player.id !== strikerId) return player;

        return {
          ...player,
          runs: player.runs + runs,
          balls: player.balls + 1,
          fours: runs === 4 ? player.fours + 1 : player.fours,
          sixes: runs === 6 ? player.sixes + 1 : player.sixes,
        };
      })
    );

    setBowler((prev) => ({
      ...prev,
      runs: prev.runs + runs,
    }));

    pushBallToOver(String(runs));
    addHistory(String(runs), `${striker.name} scored ${runs} run(s)`, nextBallNumber);

    advanceLegalBall();

    if (runs % 2 === 1) {
      rotateStrike();
    }
  };

  const handleExtra = (type) => {
    if (matchPaused || !striker) return;

    if (type === "wide" || type === "noBall") {
      setScore((prev) => prev + 1);
      setBowler((prev) => ({
        ...prev,
        runs: prev.runs + 1,
      }));

      const label = type === "wide" ? "Wd" : "Nb";
      setCurrentOverBalls((prev) => [...prev, label].slice(-6));
      setBallHistory((prev) => [
        {
          over: `${overs}.${balls}`,
          result: label,
          text: `${label} awarded`,
        },
        ...prev,
      ]);

      return;
    }

    if (type === "bye" || type === "legBye") {
      const nextBallNumber = balls + 1;
      setScore((prev) => prev + 1);

      const label = type === "bye" ? "B" : "Lb";

      pushBallToOver(label);
      addHistory(label, `${label} taken`, nextBallNumber);
      advanceLegalBall();
      rotateStrike();
    }
  };

  const handleWicket = (dismissalType) => {
    if (matchPaused || !striker) return;

    const nextPlayer = batters.find((player) => player.status === "yet_to_bat");
    const nextBallNumber = balls + 1;

    setBatters((prev) =>
      prev.map((player) => {
        if (player.id === strikerId) {
          return {
            ...player,
            balls: player.balls + 1,
            status: "out",
          };
        }

        if (nextPlayer && player.id === nextPlayer.id) {
          return {
            ...player,
            status: "batting",
          };
        }

        return player;
      })
    );

    setWickets((prev) => prev + 1);

    setBowler((prev) => ({
      ...prev,
      wickets: prev.wickets + 1,
    }));

    pushBallToOver("W");
    addHistory("W", `${striker.name} out (${dismissalType})`, nextBallNumber);

    advanceLegalBall();

    if (nextPlayer) {
      setStrikerId(nextPlayer.id);
    }

    setShowWicketModal(false);
  };

  const handleEndOver = () => {
    if (balls === 0) return;
    setBalls(0);
    setOvers((prev) => prev + 1);
    setCurrentOverBalls([]);
    rotateStrike();
  };

  const handleChangeBowler = () => {
    setBowler({
      name: "New Bowler",
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
    });
  };

  const openCorrectionModal = () => {
    setCorrectionForm({
      score: String(score),
      wickets: String(wickets),
      overs: String(overs),
      balls: String(balls),
      target: String(target),
      strikerRuns: String(striker?.runs ?? 0),
      strikerBalls: String(striker?.balls ?? 0),
      strikerFours: String(striker?.fours ?? 0),
      strikerSixes: String(striker?.sixes ?? 0),
      nonStrikerRuns: String(nonStriker?.runs ?? 0),
      nonStrikerBalls: String(nonStriker?.balls ?? 0),
      nonStrikerFours: String(nonStriker?.fours ?? 0),
      nonStrikerSixes: String(nonStriker?.sixes ?? 0),
      bowlerRuns: String(bowler.runs),
      bowlerWickets: String(bowler.wickets),
      bowlerOvers: String(bowler.overs),
      bowlerBalls: String(bowler.balls),
    });
    setShowCorrectionModal(true);
  };

  const handleCorrectionChange = (e) => {
    const { name, value } = e.target;
    setCorrectionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveCorrections = () => {
    setScore(Number(correctionForm.score || 0));
    setWickets(Number(correctionForm.wickets || 0));
    setOvers(Number(correctionForm.overs || 0));
    setBalls(Number(correctionForm.balls || 0));
    setTarget(Number(correctionForm.target || 0));

    setBatters((prev) =>
      prev.map((player) => {
        if (player.id === strikerId) {
          return {
            ...player,
            runs: Number(correctionForm.strikerRuns || 0),
            balls: Number(correctionForm.strikerBalls || 0),
            fours: Number(correctionForm.strikerFours || 0),
            sixes: Number(correctionForm.strikerSixes || 0),
          };
        }

        if (player.id === nonStrikerId) {
          return {
            ...player,
            runs: Number(correctionForm.nonStrikerRuns || 0),
            balls: Number(correctionForm.nonStrikerBalls || 0),
            fours: Number(correctionForm.nonStrikerFours || 0),
            sixes: Number(correctionForm.nonStrikerSixes || 0),
          };
        }

        return player;
      })
    );

    setBowler((prev) => ({
      ...prev,
      runs: Number(correctionForm.bowlerRuns || 0),
      wickets: Number(correctionForm.bowlerWickets || 0),
      overs: Number(correctionForm.bowlerOvers || 0),
      balls: Number(correctionForm.bowlerBalls || 0),
    }));

    setShowCorrectionModal(false);
  };

  return (
    <div className="space-y-6 bg-white">
      <AccessLimitedNotice scope="live-match" />

      {initialLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading live match state from the backend...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {saveError}
        </div>
      ) : lastSavedAt ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Live match synced to backend at {new Date(lastSavedAt).toLocaleTimeString("en-IN")}.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStatCard
          label="Current Score"
          value={`${score}/${wickets}`}
          subtext={`${getOversDisplay(overs, balls)} overs`}
          color="yellow"
        />
        <SmallStatCard label="CRR" value={crr} subtext="Current Run Rate" color="blue" />
        <SmallStatCard
          label="RRR"
          value={rrr}
          subtext={`${totalRunsNeeded} runs needed`}
          color="red"
        />
        <SmallStatCard
          label="Projected"
          value={projectedScore}
          subtext="At current pace"
          color="green"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.2fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
                CURRENT PLAYERS
              </h2>

              <button
                type="button"
                onClick={rotateStrike}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Swap Strike
              </button>
            </div>

            <div className="space-y-4">
              {striker ? (
                <PlayerMiniCard player={striker} isStriker readonly />
              ) : null}

              {nonStriker ? (
                <PlayerMiniCard
                  player={nonStriker}
                  onMakeStriker={rotateStrike}
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
              CURRENT BOWLER
            </h2>

            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-condensed text-lg uppercase tracking-[0.08em] text-slate-900">
                    {bowler.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Active Bowler</p>
                </div>

                <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-600">
                  Bowling
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Overs
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getOversDisplay(bowler.overs, bowler.balls)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Wickets
                  </p>
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    {bowler.wickets}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Runs
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {bowler.runs}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Economy
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600">
                    {getEconomy(bowler.runs, bowler.overs, bowler.balls)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleChangeBowler}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Change Bowler
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
              NEXT BATTERS
            </h2>

            <div className="mt-4 space-y-3">
              {nextBatters.length ? (
                nextBatters.slice(0, 4).map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {player.name}
                      </p>
                      <p className="text-xs text-slate-500">{player.role}</p>
                    </div>

                    <span className="text-xs font-medium text-slate-500">
                      #{index + 3}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No batters left in lineup</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
                  BALL ENTRY
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {matchTitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openCorrectionModal}
                  className="rounded-xl bg-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-200"
                >
                  Correct Score
                </button>

                <button
                  type="button"
                  onClick={() => setMatchPaused((prev) => !prev)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    matchPaused
                      ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  }`}
                >
                  {matchPaused ? "Resume Match" : "Pause Match"}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Current Over</p>
                <p className="font-heading text-3xl text-yellow-600">
                  {overs}.{balls}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, index) => {
                  const value = currentOverBalls[index];

                  return (
                    <div
                      key={index}
                      className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold ${
                        value
                          ? value === "W"
                            ? "border-red-200 bg-red-50 text-red-600"
                            : value === "4" || value === "6"
                            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                            : "border-slate-200 bg-white text-slate-900"
                          : "border-dashed border-slate-200 bg-transparent text-slate-400"
                      }`}
                    >
                      {value || "•"}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Runs
              </p>

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((run) => (
                  <button
                    key={run}
                    type="button"
                    disabled={matchPaused}
                    onClick={() => handleRuns(run)}
                    className={`rounded-xl px-4 py-4 font-heading text-2xl transition ${
                      run === 4 || run === 6
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                    } ${matchPaused ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {run}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={matchPaused}
              onClick={() => setShowWicketModal(true)}
              className={`mt-5 w-full rounded-2xl bg-red-500 px-4 py-4 font-condensed text-lg uppercase tracking-[0.12em] text-white transition hover:bg-red-600 ${
                matchPaused ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Wicket
            </button>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">Extras</p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  disabled={matchPaused}
                  onClick={() => handleExtra("wide")}
                  className="rounded-xl bg-blue-100 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-200 disabled:opacity-50"
                >
                  Wide
                </button>

                <button
                  type="button"
                  disabled={matchPaused}
                  onClick={() => handleExtra("noBall")}
                  className="rounded-xl bg-blue-100 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-200 disabled:opacity-50"
                >
                  No Ball
                </button>

                <button
                  type="button"
                  disabled={matchPaused}
                  onClick={() => handleExtra("bye")}
                  className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Bye
                </button>

                <button
                  type="button"
                  disabled={matchPaused}
                  onClick={() => handleExtra("legBye")}
                  className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Leg Bye
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleEndOver}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                End Over
              </button>

              <button
                type="button"
                onClick={handleChangeBowler}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Change Bowler
              </button>

              <button
                type="button"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                End Innings
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
              MATCH SITUATION
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Target Progress</span>
                  <span className="font-semibold text-slate-900">
                    {score} / {target}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-yellow-500"
                    style={{
                      width: `${Math.min((score / target) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Balls Used</span>
                  <span className="font-semibold text-slate-900">
                    {getTotalBalls(overs, balls)} / 120
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${(getTotalBalls(overs, balls) / 120) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-600">
                  {Number(rrr) <= Number(crr) ? "On Track" : "Need Acceleration"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {totalRunsNeeded} runs required from {totalBallsLeft} balls
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
              BALL HISTORY
            </h2>

            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {ballHistory.map((item, index) => (
                <div
                  key={`${item.over}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Over {item.over}
                    </span>

                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        item.result === "W"
                          ? "bg-red-100 text-red-600"
                          : item.result === "4" || item.result === "6"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      {item.result}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-900">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <h2 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
              PARTNERSHIP
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Runs Together
                </p>
                <p className="mt-2 font-heading text-3xl text-yellow-600">
                  {striker && nonStriker ? striker.runs + nonStriker.runs : 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Balls Faced
                </p>
                <p className="mt-2 font-heading text-3xl text-slate-900">
                  {striker && nonStriker ? striker.balls + nonStriker.balls : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showWicketModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
                SELECT DISMISSAL
              </h3>

              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dismissalOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleWicket(type)}
                  className="rounded-xl bg-red-100 px-4 py-4 text-left text-sm font-semibold text-red-600 transition hover:bg-red-200"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showCorrectionModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-2xl tracking-[0.08em] text-slate-900">
                SCORE CORRECTION PANEL
              </h3>

              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["score", "Score"],
                ["wickets", "Wickets"],
                ["overs", "Overs"],
                ["balls", "Balls"],
                ["target", "Target"],
                ["strikerRuns", "Striker Runs"],
                ["strikerBalls", "Striker Balls"],
                ["strikerFours", "Striker 4s"],
                ["strikerSixes", "Striker 6s"],
                ["nonStrikerRuns", "Non-Striker Runs"],
                ["nonStrikerBalls", "Non-Striker Balls"],
                ["nonStrikerFours", "Non-Striker 4s"],
                ["nonStrikerSixes", "Non-Striker 6s"],
                ["bowlerRuns", "Bowler Runs"],
                ["bowlerWickets", "Bowler Wickets"],
                ["bowlerOvers", "Bowler Overs"],
                ["bowlerBalls", "Bowler Balls"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="mb-2 block text-sm text-slate-500">{label}</label>
                  <input
                    name={name}
                    value={correctionForm[name]}
                    onChange={handleCorrectionChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveCorrections}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Save Corrections
              </button>

              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
} 
