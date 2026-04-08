import { useCallback, useMemo, useState } from "react";
import LiveMatchBanner from "../../components/match/LiveMatchBanner";
import AnnouncementCardSection from "../../components/match/AnnouncementCardSection";
import AnnouncementPopup from "../../components/match/AnnouncementPopup";
import RouteAction from "../../components/common/RouteAction";
import FranchiseSection from "../../components/team/FranchiseSection";
import PointsTableSection from "../../components/team/PointsTableSection";
import TopPerformersSection from "../../components/player/TopPerformersSection";
import LatestNewsSection from "../../components/common/LatestNewsSection";
import SponsorSection from "../../components/common/SponsorSection";
import SeasonStatsBar from "../../components/dashboard/SeasonStatsBar";
import useHomeContent from "../../hooks/useHomeContent";
import heroVideoAsset from "../../assets/videos/hero-video-optimized.mp4";

function getArrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

export default function HomePage() {
  const [isAnnouncementPopupOpen, setIsAnnouncementPopupOpen] = useState(true);
  const configuredHeroVideoUrl = String(
    import.meta.env.VITE_HERO_VIDEO_URL || ""
  ).trim();
  const heroVideoUrl = configuredHeroVideoUrl || heroVideoAsset;
  const heroVideoEnabled =
    import.meta.env.VITE_ENABLE_HERO_VIDEO !== "false" && heroVideoUrl.length > 0;
  const {
    content: homeContent,
    loading: homeContentLoading,
    error: homeContentError,
  } = useHomeContent();
  const franchiseItems = getArrayOrEmpty(homeContent?.franchises);
  const teamItems = getArrayOrEmpty(homeContent?.teams);
  const liveHeroStats = getArrayOrEmpty(homeContent?.heroStats);
  const liveAnnouncements = getArrayOrEmpty(homeContent?.announcements);
  const maintenanceNotice =
    homeContent?.maintenanceNotice && typeof homeContent.maintenanceNotice === "object"
      ? homeContent.maintenanceNotice
      : null;
  const isMaintenanceMode = Boolean(
    maintenanceNotice &&
      (String(maintenanceNotice.title || "").trim() ||
        String(maintenanceNotice.message || "").trim())
  );
  const announcementItems = liveAnnouncements;
  const topPerformerItems = getArrayOrEmpty(homeContent?.topPerformers);
  const seasonStats = getArrayOrEmpty(homeContent?.seasonStats);
  const hasHomeTeamData = franchiseItems.length > 0 || teamItems.length > 0;
  const visibleHomeContentError = hasHomeTeamData ? "" : homeContentError;
  const stats =
    liveHeroStats.length > 0
      ? liveHeroStats
      : [
          {
            value: String(
              franchiseItems.length > 0 ? franchiseItems.length : teamItems.length
            ),
            label: "Franchises",
          },
          {
            value: "0",
            label: "Players",
          },
          {
            value: "0",
            label: "Matches",
          },
        ];
  const closeAnnouncementPopup = useCallback(() => {
    setIsAnnouncementPopupOpen(false);
  }, []);

  const shouldRenderHeroVideo = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    return Boolean(
      heroVideoEnabled &&
        heroVideoUrl &&
        !prefersReducedMotion
    );
  }, [heroVideoEnabled, heroVideoUrl]);

  return (
    <>
      <AnnouncementPopup
        open={
          isMaintenanceMode ||
          (isAnnouncementPopupOpen && announcementItems.length > 0)
        }
        items={announcementItems}
        maintenanceNotice={maintenanceNotice}
        maintenanceMode={isMaintenanceMode}
        onClose={closeAnnouncementPopup}
      />

      {isMaintenanceMode ? null : (
        <>
        <section className="relative overflow-hidden bg-[#07111f]">
        {shouldRenderHeroVideo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#07111f]">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-contain brightness-110 contrast-110 saturate-125"
            >
              <source src={heroVideoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : null}

        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,21,37,0.30)_0%,rgba(11,16,32,0.22)_18%,rgba(15,59,46,0.16)_38%,rgba(12,74,110,0.16)_58%,rgba(30,58,138,0.16)_74%,rgba(124,45,18,0.12)_88%,rgba(17,24,39,0.20)_100%)]" />

        <div className="spl-home-shell relative z-10 flex min-h-[calc(100vh-78px)] w-full items-center py-10 sm:min-h-[calc(100vh-86px)] md:py-14">
          <div className="flex w-full flex-col items-center text-center">
            <p className="mb-4 font-condensed text-xs uppercase tracking-[0.35em] text-[#f0b4cb] sm:text-sm md:text-base">
              Raynx Systems Presents
            </p>

            <div className="w-full max-w-[1100px]">
              <h1 className="font-heading text-[1.85rem] leading-[0.95] tracking-[0.04em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-[2.7rem] md:text-[3.4rem] lg:text-[4rem] xl:text-[4.6rem]">
                SOFTWARE{" "}
                <span className="bg-gradient-to-r from-[#f0b4cb] via-[#c86d93] to-[#853953] bg-clip-text text-transparent">
                  PREMIER
                </span>{" "}
                LEAGUE
              </h1>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-base sm:leading-7 md:text-lg md:leading-8 lg:text-[1.15rem]">
              India's premier internal software cricket league where engineering
              meets the crease. A competitive weekend platform for software
              professionals to play, track, and celebrate cricket.
            </p>

            <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
              <RouteAction
                to="/fixtures"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#c86d93]/35 bg-[#853953]/28 px-7 py-3.5 font-condensed text-base uppercase tracking-[0.16em] text-[#ffd9e8] shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:bg-[#853953]/42 hover:text-white sm:w-auto sm:min-w-[190px]"
              >
                View Fixtures
              </RouteAction>

              <RouteAction
                to="/teams"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 font-condensed text-base uppercase tracking-[0.16em] text-white shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#c86d93]/45 hover:bg-[#853953]/18 hover:text-[#ffd9e8] sm:w-auto sm:min-w-[190px]"
              >
                Meet The Teams
              </RouteAction>
            </div>

            <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-white/15 bg-[rgba(133,57,83,0.26)] px-5 py-5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#853953]"
                >
                  <div className="font-heading text-3xl leading-none text-[#ffd9e8] sm:text-[2.2rem] md:text-[2.5rem]">
                    {item.value}
                  </div>

                  <div className="mt-2 font-condensed text-xs uppercase tracking-[0.22em] text-slate-100 sm:text-sm md:text-base">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {homeContentError ? (
              <p className="mt-4 text-xs text-slate-200">
                Live league stats are temporarily unavailable right now.
              </p>
            ) : homeContentLoading ? (
              <p className="mt-4 text-xs text-slate-200">Refreshing live league stats...</p>
            ) : null}
          </div>
        </div>
      </section>
      <div className="spl-theme-surface">
        {homeContentError ? (
          <div className="spl-home-shell pb-2 text-center text-xs text-slate-500">
            Home page live content is temporarily unavailable right now.
          </div>
        ) : homeContentLoading ? (
          <div className="spl-home-shell pb-2 text-center text-xs text-slate-500">
            Refreshing latest home page content...
          </div>
        ) : null}

        <div className="pt-8 md:pt-10">
          <LiveMatchBanner />
        </div>

        <div id="announcements">
          <AnnouncementCardSection items={announcementItems} />
        </div>

        <div id="latest-news">
          <LatestNewsSection items={getArrayOrEmpty(homeContent?.latestNews)} />
        </div>

        <div id="franchises">
          <FranchiseSection
            franchises={franchiseItems}
            teams={teamItems}
            loading={homeContentLoading}
            error={visibleHomeContentError}
          />
        </div>

        <div id="points-table">
          <PointsTableSection
            standingsData={homeContent?.standings}
            teams={teamItems}
            franchises={franchiseItems}
          />
        </div>

        <div id="top-performers">
          <TopPerformersSection items={topPerformerItems} />
          {homeContentError ? (
            <p className="spl-home-shell pb-2 text-center text-xs text-slate-500">
              Top performer scores are temporarily unavailable right now.
            </p>
          ) : homeContentLoading ? (
            <p className="spl-home-shell pb-2 text-center text-xs text-slate-500">
              Refreshing live top performer scores...
            </p>
          ) : null}
        </div>

        <div id="sponsors">
          <SponsorSection sponsorsData={homeContent?.sponsors} />
        </div>

        <SeasonStatsBar
          stats={seasonStats}
          loading={homeContentLoading}
          error={homeContentError}
        />
      </div>
        </>
      )}
    </>
  );
}
