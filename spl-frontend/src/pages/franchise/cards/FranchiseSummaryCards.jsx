import StatCard from "../../../components/dashboard/StatCard";

export default function FranchiseSummaryCards({ items = [] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          subtext={item.subtext}
          color={item.color}
          icon={item.icon}
        />
      ))}
    </section>
  );
}
