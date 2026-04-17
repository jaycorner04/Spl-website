import { useMemo, useState } from "react";
import RouteAction from "../common/RouteAction";
import { getMediaUrl } from "../../utils/media";

const TOP_PERFORMER_ACCENTS = [
  "from-[#853953]/38 via-[#f0b4cb]/10 to-transparent",
  "from-[#6f2f46]/38 via-[#f0b4cb]/10 to-transparent",
  "from-[#5f2439]/38 via-[#f7d7e3]/10 to-transparent",
  "from-[#7a364c]/34 via-[#f0b4cb]/12 to-transparent",
  "from-[#4f2033]/34 via-[#f7d7e3]/12 to-transparent",
];

function normalizeTopPerformers(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((player, index) => {
    const resolvedImage = getMediaUrl(player.image || player.photo || "") || null;
    const safeTableHeaders =
      Array.isArray(player.tableHeaders) && player.tableHeaders.length > 0
        ? player.tableHeaders
        : ["M", "Runs", "Wkts", "SR", "Eco"];
    const safeTableValues =
      Array.isArray(player.tableValues) && player.tableValues.length > 0
        ? player.tableValues
        : ["0", "0", "0", "0.0", "0.0"];

    return {
      href: player.href || "/players",
      name: player.name || "SPL Player",
      role: player.role || "Player",
      team: player.team || "SPL Franchise",
      points: Number(player.points ?? 0),
      image: resolvedImage,
      accent:
        player.accent ||
        TOP_PERFORMER_ACCENTS[index % TOP_PERFORMER_ACCENTS.length],
      statLine: player.statLine || `${Number(player.points ?? 0)} PTS`,
      statLabel: player.statLabel || "Top Performer",
      tableHeaders: safeTableHeaders,
      tableValues: safeTableValues,
    };
  });
}

export default function TopPerformersSection({ items = [] }) {
  const topPerformers = useMemo(() => normalizeTopPerformers(items), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalSlides = topPerformers.length;
  const currentActiveIndex =
    totalSlides > 0 ? activeIndex % totalSlides : 0;

  const moveSlide = (direction) => {
    setActiveIndex((current) =>
      direction === "left"
        ? (current - 1 + totalSlides) % totalSlides
        : (current + 1) % totalSlides
    );
  };

  const getRelativePosition = (index) => {
    const diff = (index - currentActiveIndex + totalSlides) % totalSlides;

    if (diff === 0) return 0;
    if (diff === 1) return 1;
    if (diff === totalSlides - 1) return -1;
    if (diff === 2) return 2;
    if (diff === totalSlides - 2) return -2;
    return 3;
  };

  const getCardStyle = (position) => {
    const config = {
      0: { x: 0, scale: 1, opacity: 1, zIndex: 30 },
      1: { x: 315, scale: 0.74, opacity: 0.24, zIndex: 10 },
      "-1": { x: -315, scale: 0.74, opacity: 0.24, zIndex: 10 },
      2: { x: 430, scale: 0.6, opacity: 0, zIndex: 0 },
      "-2": { x: -430, scale: 0.6, opacity: 0, zIndex: 0 },
    };

    const selected = config[position] ?? {
      x: 0,
      scale: 0.7,
      opacity: 0,
      zIndex: 0,
    };

    return {
      transform: `translate(-50%, -50%) translateX(${selected.x}px) scale(${selected.scale})`,
      opacity: selected.opacity,
      zIndex: selected.zIndex,
      pointerEvents: selected.opacity > 0 ? "auto" : "none",
    };
  };

  const getPlayerImagePanelClass = (playerName) =>
    playerName === "Abhishek"
      ? "absolute inset-y-0 left-0 w-[38%] overflow-hidden sm:w-[42%]"
      : "absolute inset-y-0 left-0 w-[38%] overflow-hidden sm:w-[42%]";

  const getPlayerCutoutClass = (playerName) =>
    playerName === "Abhishek"
      ? "absolute bottom-0 left-[58%] h-[76%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom sm:left-1/2 sm:h-auto sm:max-h-[94%] sm:w-[92%] sm:max-w-[560px]"
      : playerName === "Santhosh"
        ? "absolute bottom-0 left-[56%] h-[66%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom sm:left-1/2 sm:h-auto sm:max-h-[88%] sm:w-[78%] sm:max-w-[360px]"
        : "absolute bottom-0 left-[56%] h-[72%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom sm:left-1/2 sm:h-auto sm:max-h-[95%] sm:w-[86%] sm:max-w-[430px]";

  return (
    <section className="spl-home-shell relative z-10 w-full py-12 sm:py-14">
      <div className="mb-7">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-black sm:text-4xl lg:text-[3.1rem]">
          Top <span className="text-[#5f2439]">Performers</span>
        </h2>
      </div>

      {topPerformers.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          Top performer stats will appear here once match performance data is available.
        </div>
      ) : (
        <div className="px-0 py-4">
          <div className="relative mx-auto mt-2 h-[420px] max-w-[1120px] sm:h-[460px]">
            <button
              type="button"
              onClick={() => moveSlide("left")}
              className="absolute left-1 top-1/2 z-40 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:left-2 sm:h-12 sm:w-12"
              aria-label="Previous player"
            >
              <span className="text-2xl font-black leading-none text-black">&#8592;</span>
            </button>
            <button
              type="button"
              onClick={() => moveSlide("right")}
              className="absolute right-1 top-1/2 z-40 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:right-2 sm:h-12 sm:w-12"
              aria-label="Next player"
            >
              <span className="text-2xl font-black leading-none text-black">&#8594;</span>
            </button>

            {topPerformers.map((player, index) => {
              const position = getRelativePosition(index);

              return (
                <RouteAction
                  key={player.name}
                  to={player.href}
                  aria-label={`Open ${player.name} details`}
                  className="group absolute left-1/2 top-1/2 block h-[380px] w-[calc(100vw-3.5rem)] max-w-[760px] overflow-hidden rounded-[24px] border border-white/10 bg-[#10182f] text-left shadow-[0_24px_60px_rgba(15,23,42,0.34)] transition-all duration-200 hover:border-white/10 sm:h-[410px] sm:w-[940px] sm:max-w-none sm:rounded-[28px]"
                  style={getCardStyle(position)}
                >
                {player.image ? (
                  <img
                    src={player.image}
                    alt={player.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute left-0 top-0 hidden h-full w-[38%] object-cover object-top sm:block sm:w-[42%]"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#10182f_0%,#10182f_24%,rgba(16,24,47,0.90)_44%,#10182f_100%)]" />
                <div
                  className={`absolute left-0 top-0 h-full w-[42%] bg-gradient-to-r opacity-100 sm:w-[45%] ${player.accent}`}
                />
                <div className="absolute left-[3%] top-[14%] h-[26%] w-[34%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,197,94,0.32),rgba(245,197,24,0.32),rgba(217,70,239,0.26),rgba(34,197,94,0.32))] [mask-image:radial-gradient(circle,transparent_42%,black_43%,black_48%,transparent_49%,transparent_58%,black_59%,black_64%,transparent_65%)] opacity-55 sm:left-[2%] sm:top-[10%] sm:h-[62%] sm:w-[30%] sm:opacity-70" />

                {player.image ? (
                  <div className={getPlayerImagePanelClass(player.name)}>
                    <img
                      src={player.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className={getPlayerCutoutClass(player.name)}
                    />
                  </div>
                ) : null}

                <div className="absolute inset-y-0 right-0 z-10 flex w-[62%] flex-col justify-center px-4 py-5 text-white sm:w-[60%] sm:px-10 sm:py-6">
                  <div className="flex items-end gap-2 sm:gap-5">
                    <div className="font-heading text-[2.7rem] leading-none text-white sm:text-[7rem]">
                      {index + 1}
                    </div>

                    <div className="min-w-0 pb-1 sm:pb-2">
                      <p className="mb-1 text-[0.7rem] text-white/85 sm:text-[1.1rem]">
                        {player.team}
                      </p>
                      <h4 className="font-sans text-[1.55rem] font-bold leading-[0.92] tracking-[-0.05em] text-white sm:text-[4rem]">
                        {player.name}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end gap-2 sm:mt-5 sm:gap-3">
                    <span className="font-heading text-[1.55rem] leading-none text-[#f0b4cb] sm:text-[4.2rem]">
                      {player.statLine}
                    </span>
                    <span className="pb-1 text-[0.72rem] text-white/75 sm:pb-2 sm:text-[1.45rem]">{player.statLabel}</span>
                  </div>

                  <div className="mt-4 rounded-[2px] border border-white/16 bg-[#121c35]/88 p-2.5 backdrop-blur-sm sm:mt-6 sm:p-5">
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] sm:gap-4 sm:text-sm">
                      {player.tableHeaders.map((header) => (
                        <div key={header} className="font-semibold text-white">
                          {header}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 grid grid-cols-5 gap-1.5 text-center text-[0.8rem] leading-none text-white/88 sm:mt-3 sm:gap-4 sm:text-[1.65rem]">
                      {player.tableValues.map((value, valueIndex) => (
                        <div key={`${player.name}-${valueIndex}`}>{value}</div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between sm:mt-4">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/65 sm:text-sm">
                      {player.role}
                    </p>
                    <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/85 sm:text-xs">
                      View
                    </span>
                  </div>
                </div>
                </RouteAction>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            {topPerformers.map((player, index) => (
              <button
                key={player.name}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full ${
                  index === currentActiveIndex
                    ? "w-8 bg-slate-800"
                    : "w-2.5 bg-slate-400/60"
                }`}
                aria-label={`Go to ${player.name}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
