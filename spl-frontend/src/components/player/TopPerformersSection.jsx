import { useState } from "react";
import abhishekImage from "../../assets/players/raynx-rockets/abhishek-optimized.png";
import sandeepImage from "../../assets/players/raynx-rockets/sandeep-optimized.png";
import viswanadhImage from "../../assets/players/raynx-rockets/viswanadh.png";
import RouteAction from "../common/RouteAction";
import { getMediaUrl } from "../../utils/media";

const playerImageMap = {
  abhishek: abhishekImage,
  sandeep: sandeepImage,
  viswanadh: viswanadhImage,
};

const defaultTopPerformers = [
  {
    href: "/players",
    name: "Viswanadh",
    role: "All-Rounder",
    team: "Infosys",
    points: 243,
    image: viswanadhImage,
    accent: "from-yellow-500/35 via-orange-400/10 to-transparent",
    statLine: "243 PTS",
    statLabel: "Top All-Rounder",
    tableHeaders: ["M", "Runs", "Wkts", "SR", "Eco"],
    tableValues: ["5", "103", "3", "148.2", "6.4"],
  },
  {
    href: "/players",
    name: "Abhishek",
    role: "Batsman",
    team: "Wipro",
    points: 228,
    image: abhishekImage,
    accent: "from-cyan-500/35 via-sky-400/10 to-transparent",
    statLine: "228 RUNS",
    statLabel: "Top Batter",
    tableHeaders: ["M", "Runs", "Avg", "SR", "4/6"],
    tableValues: ["5", "228", "76.00", "145.5", "27/14"],
  },
  {
    href: "/players",
    name: "Prasad",
    role: "Bowler",
    team: "HCL",
    points: 214,
    image: null,
    accent: "from-emerald-500/35 via-teal-400/10 to-transparent",
    statLine: "4/21",
    statLabel: "Top Bowler",
    tableHeaders: ["M", "Wkts", "Eco", "BBI", "Dot%"],
    tableValues: ["5", "4", "5.25", "4/21", "58"],
  },
  {
    href: "/players",
    name: "Sandeep",
    role: "All-Rounder",
    team: "Reliance",
    points: 201,
    image: sandeepImage,
    accent: "from-rose-500/35 via-red-400/10 to-transparent",
    statLine: "201 PTS",
    statLabel: "Top All-Rounder",
    tableHeaders: ["M", "Runs", "Wkts", "SR", "Eco"],
    tableValues: ["5", "111", "2", "139.4", "6.9"],
  },
  {
    href: "/players",
    name: "Santhosh",
    role: "Batsman",
    team: "Zoho",
    points: 189,
    image: null,
    accent: "from-violet-500/35 via-fuchsia-400/10 to-transparent",
    statLine: "189 RUNS",
    statLabel: "Top Batter",
    tableHeaders: ["M", "Runs", "Avg", "SR", "4/6"],
    tableValues: ["5", "189", "63.00", "142.8", "20/9"],
  },
];

function normalizeTopPerformers(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return defaultTopPerformers;
  }

  return items.map((player, index) => {
    const fallback = defaultTopPerformers[index % defaultTopPerformers.length];
    const resolvedImage =
      getMediaUrl(player.image || player.photo || "") ||
      playerImageMap[player.playerKey] ||
      null;

    return {
      href: player.href || "/players",
      name: player.name || fallback.name,
      role: player.role || fallback.role,
      team: player.team || fallback.team,
      points: player.points ?? fallback.points,
      image: resolvedImage,
      accent: player.accent || fallback.accent,
      statLine: player.statLine || fallback.statLine,
      statLabel: player.statLabel || fallback.statLabel,
      tableHeaders:
        Array.isArray(player.tableHeaders) && player.tableHeaders.length > 0
          ? player.tableHeaders
          : fallback.tableHeaders,
      tableValues:
        Array.isArray(player.tableValues) && player.tableValues.length > 0
          ? player.tableValues
          : fallback.tableValues,
    };
  });
}

export default function TopPerformersSection({ items = defaultTopPerformers }) {
  const topPerformers = normalizeTopPerformers(items);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalSlides = topPerformers.length;

  const moveSlide = (direction) => {
    setActiveIndex((current) =>
      direction === "left"
        ? (current - 1 + totalSlides) % totalSlides
        : (current + 1) % totalSlides
    );
  };

  const getRelativePosition = (index) => {
    const diff = (index - activeIndex + totalSlides) % totalSlides;

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
    <section className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
      <div className="mb-7">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-black sm:text-4xl lg:text-[3.1rem]">
          Top <span className="text-yellow-400">Performers</span>
        </h2>
      </div>

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
                      {activeIndex + 1}
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
                    <span className="font-heading text-[1.55rem] leading-none text-[#f15c3d] sm:text-[4.2rem]">
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
                index === activeIndex ? "w-8 bg-slate-800" : "w-2.5 bg-slate-400/60"
              }`}
              aria-label={`Go to ${player.name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
