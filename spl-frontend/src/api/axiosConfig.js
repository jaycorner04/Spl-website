import axios from "axios";
import { getAuthToken } from "../utils/authStorage";

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();

export const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.PROD ? "/api" : "");

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
