import StatCard from "../../../components/dashboard/StatCard";
import ChartWrapper from "../../../components/dashboard/ChartWrapper";
import DashboardPanel from "../../../components/dashboard/DashboardPanel";
import useAdminAnalytics from "../../../hooks/useAdminAnalytics";

function getInsightClasses(tone) {
  const classes = {
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-600",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
    purple: "border-purple-200 bg-purple-50 text-purple-600",
  };

  return classes[tone] || "border-slate-200 bg-slate-50 text-slate-600";
}

export default function AdminAnalytics() {
  const { analyticsData, errorMessage, isLoading } = useAdminAnalytics();
  const {
    kpis,
    runsByTeam,
    roleDistribution,
    budgetByTeam,
    matchStatusOverview,
    insights,
  } = analyticsData;

  return (
    <div className="space-y-6 bg-white">
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading live analytics...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            subtext={item.subtext}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartWrapper
          title="Runs By Team"
          type="line"
          data={runsByTeam}
          dataKey="runs"
          xKey="name"
        />

        <ChartWrapper
          title="Role Distribution"
          type="pie"
          data={roleDistribution}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ChartWrapper
          title="Budget Left By Team"
          type="bar"
          data={budgetByTeam}
          dataKey="amount"
          xKey="name"
        />

        <DashboardPanel title="Insights Summary">
          {insights.length === 0 ? (
            <p className="text-sm text-slate-500">
              Insight cards will appear here once analytics data is available.
            </p>
          ) : (
            <div className="space-y-4">
              {insights.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border p-4 ${getInsightClasses(item.tone)}`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      </section>

      <section>
        <ChartWrapper
          title="Match Status Overview"
          type="bar"
          data={matchStatusOverview}
          dataKey="fans"
          xKey="name"
        />
      </section>
    </div>
  );
}
