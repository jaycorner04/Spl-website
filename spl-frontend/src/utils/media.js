const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();

export function getMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}
