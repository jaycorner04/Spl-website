import SectionHeader from "../common/SectionHeader";
import FixtureCard from "./FixtureCard";

export default function FixtureSection({
  title,
  highlight,
  matches = [],
  darkMode = true,
}) {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 lg:px-6 xl:px-8">
      <SectionHeader
        title={title}
        highlight={highlight}
        darkMode={darkMode}
      />

      <div className="grid gap-6">
        {matches.map((match) => (
          <FixtureCard
            key={match.id}
            teamA={match.teamA}
            teamAId={match.team_a_id}
            teamB={match.teamB}
            teamBId={match.team_b_id}
            teamALogo={match.teamALogo}
            teamAColor={match.teamAColor}
            teamBLogo={match.teamBLogo}
            teamBColor={match.teamBColor}
            date={match.date}
            time={match.time}
            venue={match.venue}
            status={match.status}
            teamAScore={match.teamAScore}
            teamBScore={match.teamBScore}
            result={match.result}
          />
        ))}
      </div>
    </section>
  );
}
