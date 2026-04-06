import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const pieColors = ["#FACC15", "#3B82F6", "#22C55E", "#A855F7", "#F97316"];

function formatChartValue(value, formatter) {
  if (typeof formatter === "function") {
    return formatter(value);
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN").format(value);
  }

  return value;
}

function CustomTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label ? <p className="text-sm font-semibold text-slate-900">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="text-xs text-slate-600">
          {entry.name}: {formatChartValue(entry.value, valueFormatter)}
        </p>
      ))}
    </div>
  );
}

export default function ChartWrapper({
  title,
  type = "line",
  data = [],
  dataKey,
  xKey = "name",
  valueFormatter,
  showPieLabels = false,
}) {
  const resolvedPieDataKey = dataKey || "value";
  const pieLegendItems = data.map((entry, index) => ({
    color: pieColors[index % pieColors.length],
    label: entry?.[xKey] || `Series ${index + 1}`,
    value: entry?.[resolvedPieDataKey] ?? 0,
  }));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-condensed text-sm font-bold uppercase tracking-[0.14em] text-slate-900">
          {title}
        </h3>
      </div>

      <div className="h-[380px] p-5">
        {type === "pie" ? (
          <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={<CustomTooltip valueFormatter={valueFormatter} />}
                  />
                  <Pie
                    data={data}
                    dataKey={resolvedPieDataKey}
                    nameKey={xKey}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={3}
                    labelLine={showPieLabels}
                    label={
                      showPieLabels
                        ? ({ value }) => formatChartValue(value, valueFormatter)
                        : false
                    }
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex min-h-[220px] items-center">
              <div className="w-full space-y-3">
                {pieLegendItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No chart data available.
                  </p>
                ) : (
                  pieLegendItems.map((item) => (
                    <div
                      key={`${item.label}-${item.color}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatChartValue(item.value, valueFormatter)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey={xKey} stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : null}

            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey={xKey} stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
                <Bar dataKey={dataKey} radius={[8, 8, 0, 0]} fill="#FACC15" />
              </BarChart>
            ) : null}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
