import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronDown } from "lucide-react";
import { resolveSearchPath } from "../../utils/searchNavigation";

const searchOptions = [
  "Latest News",
  "Fixtures",
  "Teams",
  "Players",
  "Live Score",
  "Franchises",
  "Points Table",
  "Top Performers",
];

export default function SiteSearchBar() {
  const navigate = useNavigate();

  const [selectedFilter, setSelectedFilter] = useState("Latest News");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");

  const handleSearch = () => {
    const finalText = searchText.trim() || selectedFilter;
    const resolvedPath = resolveSearchPath(finalText);

    if (!resolvedPath) {
      setError("No matching page found for your search");
      return;
    }

    setError("");
    navigate(resolvedPath);
  };

  const handleClear = () => {
    setSearchText("");
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col lg:flex-row">
          <div className="flex items-center border-b border-slate-200 lg:w-[260px] lg:border-b-0 lg:border-r">
            <div className="flex w-full items-center px-5 py-4">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full appearance-none bg-transparent pr-8 text-base font-medium text-slate-600 outline-none"
              >
                {searchOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <ChevronDown className="h-5 w-5 text-slate-500" />
            </div>
          </div>

          <div className="flex flex-1 items-center px-4">
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search here"
              className="h-[72px] w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
            />

            {searchText ? (
              <button
                type="button"
                onClick={handleClear}
                className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSearch}
              className="mr-2 inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-4 font-semibold text-white transition hover:bg-orange-600"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 px-2 text-sm font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}