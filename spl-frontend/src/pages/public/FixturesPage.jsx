import { useMemo, useState } from "react";
import {
  SiFlipkart,
  SiHcl,
  SiInfosys,
  SiMahindra,
  SiPaytm,
  SiRelianceindustrieslimited,
  SiTata,
  SiTcs,
  SiWipro,
  SiZoho,
} from "react-icons/si";
import SectionHeader from "../../components/common/SectionHeader";
import FixtureSection from "../../components/match/FixtureSection";
import useFixtures from "../../hooks/useFixtures";

const homeTeams = {
  Wipro: { icon: SiWipro, color: "#173a67" },
  Infosys: { icon: SiInfosys, color: "#0072ce" },
  HCL: { icon: SiHcl, color: "#0f6caa" },
  TCS: { icon: SiTcs, color: "#23262d" },
  Zoho: { icon: SiZoho, color: "#e42527" },
  Reliance: { icon: SiRelianceindustrieslimited, color: "#c6a04d" },
  Paytm: { icon: SiPaytm, color: "#00baf2" },
  Mahindra: { icon: SiMahindra, color: "#d71920" },
  Flipkart: { icon: SiFlipkart, color: "#2874f0" },
  Tata: { icon: SiTata, color: "#2c4a9a" },
};

function enrichMatches(matches = []) {
  return matches.map((match) => ({
    ...match,
    teamALogo: homeTeams[match.teamA]?.icon,
    teamAColor: homeTeams[match.teamA]?.color,
    teamBLogo: homeTeams[match.teamB]?.icon,
    teamBColor: homeTeams[match.teamB]?.color,
  }));
}

export default function FixturesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const { fixtures, loading, error } = useFixtures();

  const { upcomingFixtures, completedFixtures } = useMemo(() => {
    const enrichedFixtures = enrichMatches(fixtures);

    return {
      upcomingFixtures: enrichedFixtures.filter(
        (match) => match.status === "Upcoming"
      ),
      completedFixtures: enrichedFixtures.filter(
        (match) => match.status === "Completed"
      ),
    };
  }, [fixtures]);

  const getVisibleSections = () => {
    if (activeTab === "upcoming") {
      return (
        <FixtureSection
          title="UPCOMING"
          highlight="MATCHES"
          matches={upcomingFixtures}
          darkMode={false}
        />
      );
    }

    if (activeTab === "completed") {
      return (
        <FixtureSection
          title="COMPLETED"
          highlight="MATCHES"
          matches={completedFixtures}
          darkMode={false}
        />
      );
    }

    return (
      <>
        <FixtureSection
          title="UPCOMING"
          highlight="MATCHES"
          matches={upcomingFixtures}
          darkMode={false}
        />
        <FixtureSection
          title="COMPLETED"
          highlight="MATCHES"
          matches={completedFixtures}
          darkMode={false}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 sm:py-14 lg:px-6 xl:px-8">
          <SectionHeader
            title="MATCH"
            highlight="FIXTURES"
            darkMode={false}
          />

          <p className="max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Explore the complete SPL match schedule, upcoming contests, and
            finished games with results. This page is built for mobile, tablet,
            and desktop viewing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
                className={`rounded-full border px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.16em] transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${
                activeTab === "all"
                  ? "border-yellow-300 bg-yellow-50 text-yellow-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              }`}
            >
              All Matches
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
                className={`rounded-full border px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.16em] transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${
                activeTab === "upcoming"
                  ? "border-yellow-300 bg-yellow-50 text-yellow-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              }`}
            >
              Upcoming
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
                className={`rounded-full border px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.16em] transition-all duration-300 sm:px-5 sm:py-3 sm:text-sm ${
                activeTab === "completed"
                  ? "border-yellow-300 bg-yellow-50 text-yellow-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            Loading fixtures...
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            {error}
          </div>
        </div>
      ) : fixtures.length === 0 ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
            No fixtures found.
          </div>
        </div>
      ) : (
        <div className="pb-12">{getVisibleSections()}</div>
      )}
    </div>
  );
}
