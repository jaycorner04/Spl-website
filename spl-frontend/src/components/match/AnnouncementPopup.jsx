import { useEffect } from "react";
import { X } from "lucide-react";

export default function AnnouncementPopup({ open, items, onClose }) {
  const announcementItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const autoCloseTimer = window.setTimeout(() => {
      onClose();
    }, 3000);

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(autoCloseTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[30px] border border-[#853953]/20 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#853953_0%,#5f2439_55%,#2f1525_100%)] px-6 pb-6 pt-7 text-white sm:px-8">
          <div className="absolute -left-12 top-10 h-32 w-32 rounded-full bg-[#f0b4cb]/15 blur-2xl" />
          <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-[#b88a2a]/20 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close announcements"
          >
            <X size={18} />
          </button>

          <p className="font-condensed text-xs uppercase tracking-[0.34em] text-[#f7d7e3] sm:text-sm">
            SPL Update
          </p>
          <h2 className="mt-3 font-heading text-[2rem] tracking-[0.08em] sm:text-[2.6rem]">
            ANNOUNCE<span className="text-[#f0c14b]">MENTS</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            Latest match updates and key league information for visitors as soon
            as they enter the site.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-3">
          {announcementItems.map((item) => (
            <article
              key={item.label}
              className="rounded-[24px] border border-[#853953]/10 bg-[#fffafc] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
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
            </article>
          ))}
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full bg-[#853953] px-5 py-2.5 font-condensed text-sm uppercase tracking-[0.16em] text-white transition hover:bg-[#6f2f48]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
