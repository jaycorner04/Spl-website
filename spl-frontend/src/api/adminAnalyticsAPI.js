import axiosInstance from "./axiosConfig";

export async function getAdminAnalytics() {
  const response = await axiosInstance.get("/api/admin/analytics/");
  return response.data;
}
