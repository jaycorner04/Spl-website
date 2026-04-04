export default function FilterBar({ filters = [], onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filters.map((filter) => (
          <div key={filter.key}>
            <label className="mb-2 block font-condensed text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {filter.label}
            </label>

            {filter.type === "text" ? (
              <input
                type="text"
                value={filter.value}
                placeholder={filter.placeholder || ""}
                onChange={(e) => onChange?.(filter.key, e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              />
            ) : null}

            {filter.type === "select" ? (
              <select
                value={filter.value}
                onChange={(e) => onChange?.(filter.key, e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              >
                {(filter.options || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}