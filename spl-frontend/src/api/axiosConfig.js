import axios from "axios";
import { getAuthToken } from "../utils/authStorage";

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

function normalizeApiBaseUrl(value) {
  const normalizedValue = String(value || "").replace(/\/+$/, "");

  if (!normalizedValue || normalizedValue === "/api") {
    return "";
  }

  return normalizedValue.endsWith("/api")
    ? normalizedValue.slice(0, -4)
    : normalizedValue;
}

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl);

export function buildApiUrl(path = "") {
  const normalizedPath = path
    ? String(path).startsWith("/")
      ? String(path)
      : `/${String(path)}`
    : "";

  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;
