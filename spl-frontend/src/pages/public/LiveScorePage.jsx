import SectionHeader from "../../components/common/SectionHeader";
import LiveMatchHeader from "../../components/match/LiveMatchHeader";
import ScoreSummaryCard from "../../components/match/ScoreSummaryCard";
import BattingTable from "../../components/match/BattingTable";
import BowlingTable from "../../components/match/BowlingTable";
import RecentBalls from "../../components/match/RecentBalls";
import useLiveMatch from "../../hooks/useLiveMatch";

function getStrikeRate(runs, balls) {
  const safeBalls = Number(balls || 0);
  if (!safeBalls) {
    return "0.00";
  }

  return ((Number(runs || 0) / safeBalls) * 100).toFixed(2);
}

function getEconomy(runs, overs, balls) {
  const totalBalls = Number(overs || 0) * 6 + Number(balls || 0);
  if (!totalBalls) {
    return "0.00";
  }

  return ((Number(runs || 0) * 6) / totalBalls).toFixed(2);
}

function getCurrentRunRate(score, overs, balls) {
  const totalBalls = Number(overs || 0) * 6 + Number(balls || 0);
  if (!totalBalls) {
    return "0.00";
  }

  return ((Number(score || 0) * 6) / totalBalls).toFixed(2);
}

function getRequiredRunRate(target, score, overs, balls, maxOvers = 20) {
  const totalBallsFaced = Number(overs || 0) * 6 + Number(balls || 0);
  const ballsLeft = maxOvers * 6 - totalBallsFaced;
  const runsNeeded = Number(target || 0) - Number(score || 0);

  if (runsNeeded <= 0) return "0.00";
  if (ballsLeft <= 0) return "-";

  return ((runsNeeded * 6) / ballsLeft).toFixed(2);
}

function formatRelativeUpdate(updatedAt) {
  const timestamp = Number(updatedAt || 0);
  if (!timestamp) {
    return "just now";
  }

  const diffMs = Date.now() - timestamp;

  if (diffMs < 60 * 1000) {
    return "just now";
  }

  if (diffMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.floor(diffMs / (60 * 1000)))} min ago`;
  }

  return `${Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)))} hr ago`;
}

function toBattingRows(batters = []) {
  return batters.map((player) => ({
    name: player.name,
    status: String(player.status || "batting").replace(/_/g, " "),
    runs: player.runs,
    balls: player.balls,
    fours: player.fours,
    sixes: player.sixes,
    strikeRate: getStrikeRate(player.runs, player.balls),
  }));
}

function toBowlingRows(liveMatch) {
  const bowler = liveMatch?.bowler;

  if (!bowler?.name) {
    return [];
  }

  return [
    {
      name: bowler.name,
      overs: `${bowler.overs}.${bowler.balls}`,
      runs: bowler.runs,
      wickets: bowler.wickets,
      economy: getEconomy(bowler.runs, bowler.overs, bowler.balls),
    },
  ];
}

export default function LiveScorePage() {
  const { liveMatch, loading, error } = useLiveMatch(5000);

  const battingPlayers = toBattingRows(liveMatch.batters);
  const bowlingFigures = toBowlingRows(liveMatch);
  const recentBalls =
    Array.isArray(liveMatch.currentOverBalls) && liveMatch.currentOverBalls.length > 0
      ? liveMatch.currentOverBalls
      : (liveMatch.ballHistory || []).slice(0, 6).map((item) => item.result);
  const currentRunRate = getCurrentRunRate(
    liveMatch.score,
    liveMatch.overs,
    liveMatch.balls
  );
  const requiredRunRate = getRequiredRunRate(
    liveMatch.target,
    liveMatch.score,
    liveMatch.overs,
    liveMatch.balls
  );
  const runsNeeded = Math.max(Number(liveMatch.target || 0) - Number(liveMatch.score || 0), 0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-14 sm:px-5 lg:px-6 xl:px-8">
          <SectionHeader title="LIVE" highlight="SCORE" darkMode={false} />

          <p className="max-w-4xl text-base leading-8 text-slate-600 sm:text-lg">
            Follow the live match score, batting scorecard, bowling figures, and
            recent ball-by-ball momentum from the backend-fed live match state.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
        {loading ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading live match feed...
          </div>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <LiveMatchHeader
          teamA={liveMatch.battingTeam}
          teamB={liveMatch.bowlingTeam}
          status="Live"
          venue={liveMatch.venue}
          matchInfo={`${liveMatch.matchTitle} | Updated ${formatRelativeUpdate(liveMatch.updatedAt)}`}
          lightMode
        />

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <ScoreSummaryCard
            title="Current Score"
            value={`${liveMatch.score}/${liveMatch.wickets}`}
            subtitle={`${liveMatch.overs}.${liveMatch.balls} Overs`}
            accent="yellow"
            lightMode
          />
          <ScoreSummaryCard
            title="Target"
            value={`${liveMatch.target}`}
            subtitle={`Need ${runsNeeded} runs`}
            accent="blue"
            lightMode
          />
          <ScoreSummaryCard
            title="CRR"
            value={currentRunRate}
            subtitle="Current Run Rate"
            accent="green"
            lightMode
          />
          <ScoreSummaryCard
            title="RRR"
            value={requiredRunRate}
            subtitle="Required Run Rate"
            accent="red"
            lightMode
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
          <BattingTable players={battingPlayers} lightMode />
          <RecentBalls balls={recentBalls} lightMode />
        </div>

        <div className="mt-8">
          <BowlingTable bowlers={bowlingFigures} lightMode />
        </div>
      </section>
    </div>
  );
}
