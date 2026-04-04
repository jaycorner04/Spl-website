export const defaultAnnouncementItems = [
  {
    label: "Upcoming Match",
    accent: "bg-[#5f2439] text-white",
    title: "Wipro vs Infosys",
    detail: "Mar 20, 2026 · 7:30 PM",
    meta: "SPL Main Stadium, Hyderabad",
  },
  {
    label: "Next Match",
    accent: "bg-[#b88a2a] text-white",
    title: "HCL vs TCS",
    detail: "Mar 22, 2026 · 6:30 PM",
    meta: "Raynx Arena, Bangalore",
  },
  {
    label: "Completed Matches",
    accent: "bg-emerald-600 text-white",
    title: "Paytm beat Mahindra",
    detail: "Won by 14 runs",
    meta: "Last result · 172/5 vs 158/8",
  },
];

export default function AnnouncementCardSection({ items = defaultAnnouncementItems }) {
  const announcementItems =
    Array.isArray(items) && items.length > 0 ? items : defaultAnnouncementItems;

  return (
    <section className="relative z-10 mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 xl:px-10">
      <div className="mb-6">
        <h2 className="font-heading text-[1.8rem] tracking-[0.08em] text-[#5f2439] sm:text-4xl lg:text-[3rem]">
          ANNOUNCE<span className="text-[#b88a2a]">MENTS</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {announcementItems.map((item) => (
          <article
            key={item.label}
            className="rounded-[22px] border border-[#5f2439]/12 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] sm:p-5"
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
          </article>
        ))}
      </div>
    </section>
  );
}
