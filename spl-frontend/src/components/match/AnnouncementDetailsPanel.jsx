import { getAnnouncementDetailRows } from "./announcementDetails";

export default function AnnouncementDetailsPanel({ item, className = "" }) {
  if (!item) {
    return null;
  }

  const detailRows = getAnnouncementDetailRows(item);

  return (
    <div
      className={`rounded-[24px] border border-[#853953]/12 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-condensed text-[11px] uppercase tracking-[0.2em] text-[#853953]/75">
            Match Details
          </p>
          <h3 className="mt-2 font-condensed text-[1.25rem] uppercase tracking-[0.08em] text-slate-900 sm:text-[1.55rem]">
            {item.title}
          </h3>
        </div>

        <div
          className={`inline-flex rounded-full px-3 py-1 font-condensed text-[11px] uppercase tracking-[0.18em] ${item.accent || "bg-[#853953] text-white"}`}
        >
          {item.label || "Match Update"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {detailRows.map((row) => (
          <div
            key={row.key}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="font-condensed text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {row.label}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 sm:text-[0.95rem]">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
