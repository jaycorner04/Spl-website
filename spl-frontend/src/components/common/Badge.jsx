const colorMap = {
  gold: "bg-yellow-500/10 text-yellow-400 border-yellow-400/20",
  red: "bg-red-500/10 text-red-400 border-red-400/20",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-400/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-400/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-400/20",
  slate: "bg-slate-500/10 text-slate-300 border-slate-400/20",
};

export default function Badge({ label, color = "slate" }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 font-condensed text-[10px] font-bold uppercase tracking-[0.12em] ${colorMap[color]}`}
    >
      {label}
    </span>
  );
}