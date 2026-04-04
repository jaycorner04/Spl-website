export const searchRouteMap = [
  {
    keywords: ["home", "homepage", "main page"],
    path: "/",
  },
  {
    keywords: ["fixtures", "fixture", "matches", "match schedule"],
    path: "/fixtures",
  },
  {
    keywords: ["teams", "team"],
    path: "/teams",
  },
  {
    keywords: ["players", "player"],
    path: "/players",
  },
  {
    keywords: ["live", "live score", "score", "live match"],
    path: "/live",
  },
  {
    keywords: ["franchises", "franchise"],
    path: "/#franchises",
  },
  {
    keywords: ["points table", "points", "standings", "table"],
    path: "/#points-table",
  },
  {
    keywords: ["top performers", "performers", "top players"],
    path: "/#top-performers",
  },
  {
    keywords: ["latest news", "news", "updates"],
    path: "/#latest-news",
  },
];

export function resolveSearchPath(searchText = "") {
  const normalized = searchText.trim().toLowerCase();

  if (!normalized) return null;

  const directMatch = searchRouteMap.find((item) =>
    item.keywords.some((keyword) => keyword === normalized)
  );

  if (directMatch) return directMatch.path;

  const partialMatch = searchRouteMap.find((item) =>
    item.keywords.some((keyword) => normalized.includes(keyword))
  );

  if (partialMatch) return partialMatch.path;

  return null;
}