import RouteAction from "../common/RouteAction";
import useLiveMatch from "../../hooks/useLiveMatch";

function getRequiredRunRate(target, score, overs, balls, maxOvers = 20) {
  const totalBallsFaced = overs * 6 + balls;
  const ballsLeft = maxOvers * 6 - totalBallsFaced;
  const runsNeeded = target - score;

  if (runsNeeded <= 0) return "0.00";
  if (ballsLeft <= 0) return "-";

  return ((runsNeeded * 6) / ballsLeft).toFixed(2);
}

export default function LiveMatchBanner() {
  const { liveMatch, error } = useLiveMatch(5000);

  const rrr = getRequiredRunRate(
    Number(liveMatch.target || 0),
    Number(liveMatch.score || 0),
    Number(liveMatch.overs || 0),
    Number(liveMatch.balls || 0)
  );

  return (
    <section className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="group overflow-hidden rounded-[24px] border border-red-400/20 bg-[linear-gradient(90deg,rgba(185,28,28,0.92)_0%,rgba(153,27,27,0.88)_45%,rgba(127,29,29,0.84)_100%)] shadow-[0_10px_40px_rgba(127,29,29,0.25)] transition-all duration-300 hover:border-[#853953] hover:bg-[linear-gradient(90deg,rgba(133,57,83,0.96)_0%,rgba(111,47,70,0.92)_45%,rgba(95,36,57,0.88)_100%)] hover:shadow-[0_16px_40px_rgba(95,36,57,0.24)]">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-7 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 font-condensed text-xs uppercase tracking-[0.18em] text-red-600 sm:text-sm">
              Live
            </div>

            <div>
              <h2 className="font-condensed text-[1.05rem] uppercase tracking-[0.12em] text-white sm:text-2xl lg:text-[1.7rem]">
                {liveMatch.matchTitle}
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-red-50/90 sm:text-[15px]">
                {liveMatch.battingTeam}: {liveMatch.score}/{liveMatch.wickets} (
                {liveMatch.overs}.{liveMatch.balls} ov) | Target: {liveMatch.target} | RRR: {rrr}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-red-50/80 sm:text-sm">
                {liveMatch.venue}
                {error ? " | Live sync delayed" : ""}
              </p>
            </div>
          </div>

          <RouteAction
            to="/live"
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 font-condensed text-sm uppercase tracking-[0.14em] text-red-600 transition group-hover:text-[#853953] hover:bg-red-50 sm:px-6 sm:text-base"
          >
            Watch Live
          </RouteAction>
        </div>
      </div>
    </section>
  );
}
