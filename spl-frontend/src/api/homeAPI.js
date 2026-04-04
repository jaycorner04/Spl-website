import axiosInstance from "./axiosConfig";

export async function getHomeContent() {
  const response = await axiosInstance.get("/api/home/");
  return response.data;
}

export async function getAnnouncements() {
  const response = await axiosInstance.get("/api/home/announcements/");
  return response.data;
}

export async function getStandings() {
  const response = await axiosInstance.get("/api/home/standings/");
  return response.data;
}

export async function getTopPerformersContent() {
  const response = await axiosInstance.get("/api/home/top-performers/");
  return response.data;
}

export async function getLatestNews() {
  const response = await axiosInstance.get("/api/home/latest-news/");
  return response.data;
}

export async function getSponsors() {
  const response = await axiosInstance.get("/api/home/sponsors/");
  return response.data;
}
