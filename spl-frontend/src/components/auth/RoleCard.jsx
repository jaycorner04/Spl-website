export default function RoleCard({
  icon,
  title,
  subtitle,
  active = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[16px] border p-3 text-left transition-all duration-300 ${
        active
          ? "border-yellow-400 bg-yellow-50 shadow-[0_0_14px_rgba(250,204,21,0.10)]"
          : "border-slate-200 bg-white hover:border-fuchsia-400 hover:bg-fuchsia-50"
      }`}
    >
      <div className="text-lg">{icon}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </button>
  );
}