export default function ExportButton({ label = "Export CSV", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-yellow-400 transition hover:bg-yellow-400/15 hover:text-yellow-300"
    >
      ⬇ {label}
    </button>
  );
}