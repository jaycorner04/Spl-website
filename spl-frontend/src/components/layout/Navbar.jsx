import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import headerLogo from "../../assets/images/header-logo.png";
import RouteAction from "../common/RouteAction";
import { resolveSearchPath } from "../../utils/searchNavigation";

const navItems = [
  { name: "Home", path: "/" },
  { name: "Fixtures", path: "/fixtures" },
  { name: "Teams", path: "/teams" },
  { name: "Venues", path: "/venues" },
  { name: "Live", path: "/live" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchScope, setSearchScope] = useState("all");

  const handleSearchSubmit = (value = searchText) => {
    const scopedValue =
      searchScope && searchScope !== "all"
        ? `${searchScope} ${value}`.trim()
        : value;
    const nextPath = resolveSearchPath(scopedValue);

    if (nextPath) {
      navigate(nextPath);
      setSearchOpen(false);
      setSearchText("");
    }
  };

  const isActivePath = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getNavButtonClass = (path) =>
    [
      "rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-200 xl:text-[15px]",
      isActivePath(path)
        ? "text-[#ffd9e8]"
        : "text-white hover:text-[#ffd9e8]",
    ].join(" ");

  return (
    <header className="fixed left-0 right-0 top-0 z-[100] border-b border-white/10 bg-[#853953] shadow-md">
      <div className="mx-auto flex h-[78px] w-full max-w-[1440px] items-center justify-between px-3 sm:h-[86px] sm:px-6 lg:px-8">
        <RouteAction to="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-[50px] w-[138px] items-center justify-center overflow-hidden sm:h-[62px] sm:w-[180px] lg:h-[68px] lg:w-[210px]">
            <img
              src={headerLogo}
              alt="Software Premier League Logo"
              className="h-full w-full object-contain mix-blend-screen"
            />
          </div>

          <div className="hidden min-w-0 flex-col justify-center sm:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80 lg:text-xs">
              Software
            </span>
            <span className="whitespace-nowrap text-xl font-bold uppercase tracking-[0.16em] text-[#ffd9e8] lg:text-[2rem]">
              Premier League
            </span>
          </div>
        </RouteAction>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <RouteAction
              key={item.path}
              to={item.path}
              className={getNavButtonClass(item.path)}
            >
              {item.name}
            </RouteAction>
          ))}

          <div className="ml-3 flex items-center">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#ffd9e8]"
              aria-label="Open search"
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <RouteAction
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-white/20 hover:text-[#ffd9e8]"
          >
            Sign In
          </RouteAction>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 lg:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`overflow-hidden border-t border-white/10 bg-[#853953] transition-all duration-300 lg:hidden ${
          mobileOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6">
          <nav className="flex flex-col gap-1">
            <div className="mb-2 flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-3">
              <Search size={16} className="text-[#ffd9e8]" />
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/65 focus:outline-none"
              />
            </div>

            {navItems.map((item) => (
              <RouteAction
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={
                  [
                    "rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
                    isActivePath(item.path)
                      ? "bg-white/10 text-[#ffd9e8]"
                      : "text-white hover:bg-white/10 hover:text-[#ffd9e8]",
                  ].join(" ")
                }
              >
                {item.name}
              </RouteAction>
            ))}

            <RouteAction
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-white/20 hover:text-[#ffd9e8]"
            >
              Sign In
            </RouteAction>
          </nav>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute left-0 right-0 top-full hidden px-6 pt-4 transition-all duration-300 lg:block ${
          searchOpen ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-[1040px]">
          <div
            className={`pointer-events-auto flex items-center gap-3 rounded-full border border-[#574857] bg-[#e8e8ea] p-2 shadow-[0_12px_28px_rgba(15,23,42,0.28)] transition-all duration-300 ${
              searchOpen ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            <div className="relative flex min-w-[108px] items-center rounded-full bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <select
                value={searchScope}
                onChange={(event) => setSearchScope(event.target.value)}
                className="w-full appearance-none bg-transparent pr-7 text-lg text-slate-700 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="fixtures">Fixtures</option>
                <option value="teams">Teams</option>
                <option value="players">Players</option>
                <option value="latest news">News</option>
                <option value="points table">Points Table</option>
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-700"
              />
            </div>

            <Search size={20} className="text-[#5f2439]" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              placeholder="Search here"
              autoFocus
              className="w-full bg-transparent text-[1.05rem] text-slate-700 placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="inline-flex items-center rounded-full bg-[#ff5a1f] px-6 py-3 font-sans text-[1.05rem] font-semibold text-white shadow-[0_8px_18px_rgba(255,90,31,0.35)] transition hover:bg-[#ea4b13]"
            >
              <Search size={18} className="mr-2" />
              Search
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f5] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:text-slate-700"
              aria-label="Close search dropdown"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
