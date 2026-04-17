import { useMemo, useState } from "react";
import AnnouncementDetailsPanel from "./AnnouncementDetailsPanel";
import { getAnnouncementItemKey } from "./announcementDetails";

export default function AnnouncementCardSection({ items = [] }) {
  const [selectedAnnouncementKey, setSelectedAnnouncementKey] = useState("");
  const announcementItems = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items]
  );
  const selectedAnnouncement = useMemo(
    () =>
      announcementItems.find(
        (item, index) =>
          getAnnouncementItemKey(item, index) === selectedAnnouncementKey
      ) || null,
    [announcementItems, selectedAnnouncementKey]
  );

  return (
    <section className="spl-home-shell relative z-10 w-full pt-5 sm:pt-6">
      <div className="mb-6">
        <h2 className="font-heading text-[1.8rem] tracking-[0.08em] text-[#5f2439] sm:text-4xl lg:text-[3rem]">
          ANNOUNCE<span className="text-[#5f2439]">MENTS</span>
        </h2>
      </div>

      {announcementItems.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
          {announcementItems.map((item, index) => {
            const itemKey = getAnnouncementItemKey(item, index);
            const isSelected = itemKey === selectedAnnouncementKey;

            return (
            <button
              type="button"
              key={itemKey}
              onClick={() =>
                setSelectedAnnouncementKey((currentKey) =>
                  currentKey === itemKey ? "" : itemKey
                )
              }
              className={`rounded-[22px] border p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 sm:p-5 ${
                isSelected
                  ? "border-[#853953]/30 bg-[#fff6f9] ring-2 ring-[#853953]/12"
                  : "border-[#5f2439]/12 bg-white hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)]"
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`inline-flex rounded-full px-3 py-1 font-condensed text-[11px] uppercase tracking-[0.18em] ${item.accent}`}
              >
                {item.label}
              </div>

              <h3 className="mt-4 font-condensed text-[1.3rem] uppercase tracking-[0.08em] text-slate-900 sm:text-[1.7rem]">
                {item.title}
              </h3>

              <p className="mt-3 text-sm font-medium text-[#5f2439] sm:text-base">
                {item.detail}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.meta}
              </p>
              <p className="mt-4 font-condensed text-[11px] uppercase tracking-[0.18em] text-[#853953]/70">
                {isSelected ? "Hide details" : "View details"}
              </p>
            </button>
          )})}
          </div>

          {selectedAnnouncement ? (
            <AnnouncementDetailsPanel item={selectedAnnouncement} />
          ) : null}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          No announcements are published right now.
        </div>
      )}
    </section>
  );
}
