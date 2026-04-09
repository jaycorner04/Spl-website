import StatCard from "../../../../components/dashboard/StatCard";
import FranchiseHeroSection from "../../sections/FranchiseHeroSection";
import FranchiseNextMatchSection from "../../sections/FranchiseNextMatchSection";
import FranchiseNotesSection from "../../sections/FranchiseNotesSection";
import FranchiseNoticesSection from "../../sections/FranchiseNoticesSection";

export default function DashboardSection({
  displayedSummaryCards,
  franchiseDashboardSummary,
  franchiseDashboardLoading,
  franchiseDashboardContext,
  franchiseDashboardNextMatch,
  franchiseDashboardNotices,
  getNoticeColor,
  isFranchiseAdmin,
  franchiseTeamRosterRows,
  scopedFranchiseRows,
  activeManagedFranchise,
}) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {displayedSummaryCards.map((item) => (
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

      <FranchiseHeroSection
        title={franchiseDashboardSummary?.heroTitle || "Franchise Dashboard"}
        loading={franchiseDashboardLoading}
        context={franchiseDashboardContext}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <FranchiseNextMatchSection
          title={franchiseDashboardNextMatch?.title || "Next Match"}
          loading={franchiseDashboardLoading}
          match={franchiseDashboardNextMatch?.match}
        />
        <FranchiseNoticesSection
          title={franchiseDashboardNotices?.title || "Notices"}
          loading={franchiseDashboardLoading}
          items={franchiseDashboardNotices?.items}
          getNoticeColor={getNoticeColor}
        />
      </section>

      <FranchiseNotesSection
        isFranchiseAdmin={isFranchiseAdmin}
        franchiseTeamRosterRows={franchiseTeamRosterRows}
        scopedFranchiseRows={scopedFranchiseRows}
        activeManagedFranchise={activeManagedFranchise}
      />
    </div>
  );
}
