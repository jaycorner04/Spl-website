import { SiGoogle } from "react-icons/si";
import raynxSystemsTitleSponsor from "../../assets/sponsors/raynx-systems-title-sponsor.jpg";
import { getMediaUrl } from "../../utils/media";

const sponsorImageMap = {
  "raynx-systems-title-sponsor.jpg": raynxSystemsTitleSponsor,
};

const premierPartnerRenderMap = {
  "Angel One": () => (
    <div className="text-[1.55rem] font-black tracking-[-0.05em] text-[#3557ff] sm:text-[2.8rem]">
      Angel<span className="font-bold">One</span>
    </div>
  ),
  RuPay: () => (
    <div className="text-[1.55rem] font-black italic tracking-[-0.05em] text-[#2c2f77] sm:text-[2.7rem]">
      RuPay
    </div>
  ),
  "Google AI Mode": () => (
    <div className="flex items-center gap-3">
      <SiGoogle className="h-8 w-8 text-black sm:h-12 sm:w-12" />
      <div className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] sm:text-base">
        AI Mode
      </div>
    </div>
  ),
};

function renderPremierPartner(partnerName = "") {
  const namedRenderer = premierPartnerRenderMap[partnerName];

  if (namedRenderer) {
    return namedRenderer();
  }

  return (
    <div className="rounded-full border border-slate-300 bg-white px-5 py-3 text-center text-lg font-black tracking-[-0.04em] text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.08)] sm:text-[1.7rem]">
      {partnerName || "Premier Partner"}
    </div>
  );
}

function CornerStreak({ className, color, rotate }) {
  return (
    <div className={`absolute ${className}`} style={{ transform: rotate }}>
      <div
        className="relative h-4 w-24 rounded-full shadow-[0_4px_10px_rgba(15,23,42,0.12)] sm:h-5 sm:w-28"
        style={{ backgroundColor: color }}
      >
        <div className="absolute -left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_4px_10px_rgba(15,23,42,0.12)] sm:h-7 sm:w-7" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

function normalizePremierPartners(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((partner) => ({
      name: String(partner?.name || "").trim(),
    }))
    .filter((partner) => partner.name);
}

function normalizeSupportPartners(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((partner) => ({
      role: String(partner?.role || "").trim(),
      brand: String(partner?.brand || "").trim(),
      color: String(partner?.color || "").trim() || "#334155",
      subline: String(partner?.subline || "").trim(),
    }))
    .filter((partner) => partner.role && partner.brand);
}

export default function SponsorSection({ sponsorsData }) {
  const hasExplicitTitleSponsor =
    sponsorsData &&
    Object.prototype.hasOwnProperty.call(sponsorsData, "titleSponsor");
  const titleSponsor = hasExplicitTitleSponsor
    ? sponsorsData?.titleSponsor
    : null;
  const titleSponsorLabel = titleSponsor?.label || "Title Sponsor";
  const titleSponsorName = titleSponsor?.name || "";
  const titleSponsorImage = titleSponsor?.imageFile
    ? sponsorImageMap[titleSponsor.imageFile] ||
      getMediaUrl(titleSponsor.imageFile)
    : "";
  const livePremierPartners = Array.isArray(sponsorsData?.premierPartners)
    ? sponsorsData.premierPartners
    : [];
  const liveSupportPartners = Array.isArray(sponsorsData?.supportPartners)
    ? sponsorsData.supportPartners
    : [];
  const premierPartners = normalizePremierPartners(livePremierPartners);
  const supportPartners = normalizeSupportPartners(liveSupportPartners);

  return (
    <section className="spl-home-shell w-full py-10 sm:py-14">
      {titleSponsor || premierPartners.length > 0 || supportPartners.length > 0 ? (
        <div className="relative overflow-hidden px-1 py-4 sm:px-2 sm:py-6 lg:px-4">
          <CornerStreak className="-left-4 top-8" color="#b94378" rotate="rotate(-38deg)" />
          <CornerStreak className="left-20 top-3" color="#e5b41c" rotate="rotate(-52deg)" />
          <CornerStreak className="-left-6 top-44" color="#f05282" rotate="rotate(-18deg)" />
          <CornerStreak className="-left-5 bottom-16" color="#ef7f45" rotate="rotate(28deg)" />
          <CornerStreak className="left-6 bottom-4" color="#d6bf1d" rotate="rotate(-12deg)" />

          <CornerStreak className="-right-1 top-3" color="#ef7f45" rotate="rotate(132deg)" />
          <CornerStreak className="right-20 top-9" color="#dc6587" rotate="rotate(142deg)" />
          <CornerStreak className="right-1 top-20" color="#dfbf36" rotate="rotate(138deg)" />
          <CornerStreak className="-right-6 bottom-20" color="#59b95b" rotate="rotate(162deg)" />
          <CornerStreak className="right-1 bottom-1" color="#a6cf33" rotate="rotate(170deg)" />

          <div className="relative z-10 flex flex-col items-center">
            {titleSponsor ? (
              <>
                <p className="font-condensed text-xs font-bold uppercase tracking-[0.2em] text-slate-900 sm:text-sm">
                  {titleSponsorLabel}
                </p>
                {titleSponsorImage ? (
                  <div className="mt-6 flex justify-center">
                    <img
                      src={titleSponsorImage}
                      alt={titleSponsorName}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full max-w-[420px] object-contain sm:max-w-[520px]"
                    />
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white px-8 py-10 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <p className="font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                      {titleSponsorLabel}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">
                      {titleSponsorName}
                    </p>
                  </div>
                )}
              </>
            ) : null}

            {premierPartners.length > 0 || supportPartners.length > 0 ? (
              <>
                <div className="mt-6 h-px w-full max-w-[300px] bg-slate-300" />

                <p className="mt-9 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-slate-900 sm:text-sm">
                  Premier Partners
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-6 sm:gap-12">
                  {premierPartners.map((partner) => (
                    <div key={partner.name} className="flex items-center justify-center">
                      {renderPremierPartner(partner.name)}
                    </div>
                  ))}
                </div>

                <div className="mt-8 h-px w-full bg-slate-200" />

                <div className="mt-8 grid w-full gap-6 md:grid-cols-3 xl:grid-cols-5">
                  {supportPartners.map((partner, index) => (
                    <div
                      key={partner.brand}
                      className={`flex min-h-[148px] flex-col items-center justify-center px-4 text-center ${
                        index !== supportPartners.length - 1 ? "xl:border-r xl:border-slate-200" : ""
                      }`}
                    >
                      <p className="font-condensed text-xs font-bold uppercase tracking-[0.18em] text-slate-900 sm:text-sm">
                        {partner.role}
                      </p>
                      <div
                        className="mt-5 break-words text-[1.45rem] font-black tracking-[-0.05em] sm:text-[2.6rem]"
                        style={{ color: partner.color }}
                      >
                        {partner.brand}
                      </div>
                      {partner.subline ? (
                        <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-slate-700 sm:text-[0.78rem]">
                          {partner.subline}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          Sponsor content will appear here once it is published.
        </div>
      )}
    </section>
  );
}
