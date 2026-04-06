import { API_BASE_URL } from "../api/axiosConfig";

export function getMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/media/")) {
    if (!API_BASE_URL) {
      return path;
    }

    return `${API_BASE_URL}${path}`;
  }
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}
