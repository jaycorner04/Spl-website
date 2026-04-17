import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import AnnouncementDetailsPanel from "./AnnouncementDetailsPanel";
import { getAnnouncementItemKey } from "./announcementDetails";

export default function AnnouncementPopup({
  open,
  items,
  maintenanceNotice,
  maintenanceMode = false,
  onClose,
}) {
  const announcementItems = useMemo(
    () => (Array.isArray(items) ? items : []),
    [items]
  );
  const [selectedAnnouncementKey, setSelectedAnnouncementKey] = useState("");
  const handleClose = useCallback(() => {
    setSelectedAnnouncementKey("");
    onClose();
  }, [onClose]);
  const visibleMaintenanceNotice = useMemo(() => {
    if (!maintenanceNotice || typeof maintenanceNotice !== "object") {
      return null;
    }

    const title = String(maintenanceNotice.title || "").trim();
    const message = String(maintenanceNotice.message || "").trim();

    if (!title && !message) {
      return null;
    }

    return {
      title: title || "Website Maintenance",
      message,
    };
  }, [maintenanceNotice]);
  const maintenanceAnnouncementItem = useMemo(() => {
    if (!visibleMaintenanceNotice) {
      return null;
    }

    return {
      label: "Maintenance Notice",
      accent: "bg-sky-600 text-white",
      title: visibleMaintenanceNotice.title,
      detail:
        visibleMaintenanceNotice.message || "Website maintenance is currently active.",
      meta: "Homepage is temporarily unavailable while maintenance is active.",
      matchDetails: [
        {
          label: "Notice",
          value:
            visibleMaintenanceNotice.message ||
            "Website maintenance is currently active.",
        },
        {
          label: "Status",
          value: "Approved",
        },
      ],
    };
  }, [visibleMaintenanceNotice]);
  const renderedAnnouncementItems = useMemo(() => {
    if (maintenanceMode) {
      return maintenanceAnnouncementItem ? [maintenanceAnnouncementItem] : [];
    }

    return announcementItems;
  }, [announcementItems, maintenanceAnnouncementItem, maintenanceMode]);
  const selectedAnnouncement = useMemo(
    () =>
      renderedAnnouncementItems.find(
        (item, index) =>
          getAnnouncementItemKey(item, index) === selectedAnnouncementKey
      ) || null,
    [renderedAnnouncementItems, selectedAnnouncementKey]
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (maintenanceMode) {
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    const autoCloseTimer = window.setTimeout(() => {
      handleClose();
    }, 10000);

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(autoCloseTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose, maintenanceMode, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={maintenanceMode ? undefined : handleClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[#853953]/20 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#853953_0%,#5f2439_55%,#2f1525_100%)] px-6 pb-6 pt-7 text-white sm:px-8">
          <div className="absolute -left-12 top-10 h-32 w-32 rounded-full bg-[#f0b4cb]/15 blur-2xl" />
          <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-[#f0b4cb]/18 blur-3xl" />

          {!maintenanceMode ? (
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close announcements"
            >
              <X size={18} />
            </button>
          ) : null}

          <p className="font-condensed text-xs uppercase tracking-[0.34em] text-[#f7d7e3] sm:text-sm">
            SPL Update
          </p>
          <h2 className="mt-3 font-heading text-[2rem] tracking-[0.08em] sm:text-[2.6rem]">
            {maintenanceMode ? (
              <>
                MAINTEN<span className="text-white">ANCE</span>
              </>
            ) : (
              <>
                ANNOUNCE<span className="text-white">MENTS</span>
              </>
            )}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            {maintenanceMode
              ? "The homepage is temporarily locked while maintenance is active. Normal league sections will return automatically once the notice is rejected or removed by admin."
              : "Latest match updates and key league information for visitors as soon as they enter the site."}
          </p>

          {visibleMaintenanceNotice ? (
            <div className="mt-4 rounded-2xl border border-[#f0b4cb]/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="font-condensed text-[11px] uppercase tracking-[0.22em] text-[#f7d7e3]">
                {visibleMaintenanceNotice.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-white/90">
                {visibleMaintenanceNotice.message}
              </p>
            </div>
          ) : null}
        </div>

        <div className="spl-scrollbar flex-1 overflow-y-auto">
          <div
            className={`grid gap-4 px-5 py-5 sm:px-6 sm:py-6 ${
              maintenanceMode ? "lg:grid-cols-1" : "lg:grid-cols-3"
            }`}
          >
            {renderedAnnouncementItems.map((item, index) => {
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
                  className={`rounded-[24px] border p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-200 ${
                    isSelected
                      ? "border-[#853953]/35 bg-[#fff3f7] ring-2 ring-[#853953]/15"
                      : maintenanceMode
                      ? "border-[#853953]/18 bg-[#fffafc]"
                      : "border-[#853953]/10 bg-[#fffafc] hover:-translate-y-1 hover:border-[#853953]/20"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div
                    className={`inline-flex rounded-full px-3 py-1 font-condensed text-[11px] uppercase tracking-[0.18em] ${item.accent}`}
                  >
                    {item.label}
                  </div>

                  <h3 className="mt-4 font-condensed text-[1.25rem] uppercase tracking-[0.08em] text-slate-900 sm:text-[1.45rem]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm font-semibold text-[#853953] sm:text-[0.95rem]">
                    {item.detail}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.meta}
                  </p>
                  <p className="mt-4 font-condensed text-[11px] uppercase tracking-[0.18em] text-[#853953]/70">
                    {isSelected ? "Hide details" : "View details"}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedAnnouncement ? (
            <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
              <AnnouncementDetailsPanel
                item={selectedAnnouncement}
                className="bg-[#fffafc]"
              />
            </div>
          ) : null}
        </div>

        {!maintenanceMode ? (
          <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-full bg-[#853953] px-5 py-2.5 font-condensed text-sm uppercase tracking-[0.16em] text-white transition hover:bg-[#6f2f48]"
            >
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
