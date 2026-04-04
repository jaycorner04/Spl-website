import { Link } from "react-router-dom";

export default function AuthLeftPanel({
  titleTop = "SOFTWARE",
  titleMiddle = "PREMIER",
  titleBottom = "LEAGUE",
  subtitle = "The ultimate cricket league management platform. Where code meets cricket.",
}) {
  return (
    <div className="relative hidden min-h-screen overflow-hidden lg:flex">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#041229_50%,#020617_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.12),transparent_30%)]" />

      <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-8 py-10 xl:px-10 xl:py-12">
        <div />

        <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center text-center">
          <div className="flex h-18 w-18 items-center justify-center rounded-[20px] bg-blue-600 p-5 shadow-[0_0_24px_rgba(37,99,235,0.22)]">
            <span className="text-3xl text-white">🏆</span>
          </div>

          <h1 className="mt-6 font-heading text-[3rem] leading-[0.92] tracking-[0.06em] xl:text-[3.7rem]">
            <span className="bg-gradient-to-r from-sky-200 via-blue-300 to-indigo-500 bg-clip-text text-transparent">
              {titleTop}
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-600 bg-clip-text text-transparent">
              {titleMiddle}
            </span>
            <br />
            <span className="bg-gradient-to-r from-slate-100 via-blue-300 to-blue-500 bg-clip-text text-transparent">
              {titleBottom}
            </span>
          </h1>

          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300 xl:text-base">
            {subtitle}
          </p>

          <div className="mt-6 flex items-center gap-4 text-xs text-slate-400 xl:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl text-slate-200">8</span>
              <span>Teams</span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl text-slate-200">124</span>
              <span>Players</span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="font-heading text-2xl text-slate-200">S3</span>
              <span>Season</span>
            </div>
          </div>
        </div>

        <div className="flex items-end">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-blue-400/40 hover:bg-white/10 hover:text-white"
          >
            <span className="text-base">←</span>
            <span>Back to Home Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}