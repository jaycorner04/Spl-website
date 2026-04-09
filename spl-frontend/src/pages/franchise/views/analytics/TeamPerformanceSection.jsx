import FranchiseInsightsSection from "../../sections/FranchiseInsightsSection";

export default function TeamPerformanceSection({
  loading,
  squadSummary,
  budgetTrend,
  getBudgetBarColorClass,
  formatDashboardLakhs,
}) {
  return (
    <div className="space-y-6">
      <FranchiseInsightsSection
        loading={loading}
        squadSummary={squadSummary}
        budgetTrend={budgetTrend}
        getBudgetBarColorClass={getBudgetBarColorClass}
        formatDashboardLakhs={formatDashboardLakhs}
      />
    </div>
  );
}
