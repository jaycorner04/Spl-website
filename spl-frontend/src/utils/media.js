const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export function getMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/media/")) {
    if (!API_BASE_URL || API_BASE_URL === "/api") {
      return path;
    }

    const normalizedBaseUrl = API_BASE_URL.endsWith("/api")
      ? API_BASE_URL.slice(0, -4)
      : API_BASE_URL;
    return `${normalizedBaseUrl}${path}`;
  }
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}
