const defaultNewsItems = [
  {
    title: "Wipro and Infosys set for a season-defining clash in Hyderabad",
    category: "Match Preview",
    date: "Apr 4, 2026",
    excerpt:
      "The current table leaders meet under lights as both sides push for playoff control.",
  },
  {
    title: "Abhishek and Viswanadh continue to lead the SPL performer charts",
    category: "Player Spotlight",
    date: "Apr 3, 2026",
    excerpt:
      "Batting brilliance from Wipro and all-round impact from Infosys keep both stars ahead of the field.",
  },
  {
    title: "HCL and TCS finalise preparations for a crucial Bengaluru fixture",
    category: "League Update",
    date: "Apr 2, 2026",
    excerpt:
      "Both teams are level on points and will treat the next round as a direct playoff-position battle.",
  },
  {
    title: "Paytm's recent win over Mahindra reshapes the mid-table race",
    category: "Match Report",
    date: "Apr 1, 2026",
    excerpt:
      "A disciplined defence of 172/5 tightened the race for the final qualification spots.",
  },
];

export default function LatestNewsSection({
  items = defaultNewsItems,
  allowFallback = true,
}) {
  const hasLiveItems = Array.isArray(items) && items.length > 0;
  const newsItems = hasLiveItems
    ? items
    : allowFallback
      ? defaultNewsItems
      : [];
  const scrollingNews = [...newsItems, ...newsItems];

  return (
    <section className="spl-home-shell relative z-10 w-full py-8 sm:py-10">
      <div className="mb-7 flex items-center justify-between">
        <h2 className="font-heading text-3xl tracking-[0.08em] text-[#5f2439] sm:text-4xl lg:text-[3rem]">
          LATEST <span className="text-[#b88a2a]">NEWS</span>
        </h2>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,#853953_0%,#6f2f46_52%,#4f2033_100%)] shadow-[0_12px_34px_rgba(95,36,57,0.22)]">
        <div className="relative overflow-hidden spl-news-edge px-3 py-3 sm:px-4">
          {scrollingNews.length > 0 ? (
            <div className="flex w-max items-center gap-4 spl-news-marquee">
              {scrollingNews.map((item, index) => (
                <article
                  key={`${item.title}-${index}`}
                  className="flex min-w-[320px] flex-shrink-0 items-center gap-3 px-4 py-3 sm:min-w-[460px] sm:px-5"
                >
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 font-condensed text-[11px] uppercase tracking-[0.18em] text-white sm:text-xs">
                    {item.category}
                  </div>

                  <h3 className="line-clamp-1 font-condensed text-base uppercase tracking-[0.06em] text-white sm:text-lg">
                    {item.title}
                  </h3>

                  <div className="ml-auto whitespace-nowrap text-sm text-white/80">
                    {item.date}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-white/85 sm:px-5">
              No latest news has been published yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
