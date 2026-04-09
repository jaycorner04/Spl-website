import FranchiseNextMatchSection from "../../sections/FranchiseNextMatchSection";
import FranchiseNoticesSection from "../../sections/FranchiseNoticesSection";

export default function MatchReportsSection({
  franchiseDashboardNextMatch,
  franchiseDashboardNotices,
  franchiseDashboardLoading,
  getNoticeColor,
}) {
  return (
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
  );
}
