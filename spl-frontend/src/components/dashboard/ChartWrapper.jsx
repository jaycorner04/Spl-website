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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label ? <p className="text-sm font-semibold text-slate-900">{label}</p> : null}
      {payload.map((entry, index) => (
        <p key={index} className="text-xs text-slate-600">
          {entry.name}: {entry.value}
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
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-condensed text-sm font-bold uppercase tracking-[0.14em] text-slate-900">
          {title}
        </h3>
      </div>

      <div className="h-[380px] p-5">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip content={<CustomTooltip />} />
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
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={dataKey} radius={[8, 8, 0, 0]} fill="#FACC15" />
            </BarChart>
          ) : null}

          {type === "pie" ? (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey={dataKey || "value"}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={115}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : null}
        </ResponsiveContainer>
      </div>
    </div>
  );
}