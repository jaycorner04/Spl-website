import axiosInstance from "./axiosConfig";

export async function getPerformances(params = {}) {
  const response = await axiosInstance.get("/api/performances/", { params });
  return response.data;
}
