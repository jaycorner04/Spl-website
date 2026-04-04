import PlayerCard from "./PlayerCard";

export default function PlayersGrid({ players = [] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          id={player.id}
          name={player.name}
          role={player.role}
          team={player.team}
          points={player.points}
          stat1={player.stat1}
          stat2={player.stat2}
          shortName={player.shortName}
          color={player.color}
          image={player.image}
        />
      ))}
    </div>
  );
}