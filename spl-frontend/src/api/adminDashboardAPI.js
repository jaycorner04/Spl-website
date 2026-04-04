import axiosInstance from "./axiosConfig";

export async function getAdminDashboard() {
  const response = await axiosInstance.get("/api/admin/dashboard/");
  return response.data;
}

export async function getAdminDashboardSection(section) {
  const response = await axiosInstance.get(`/api/admin/dashboard/${section}/`);
  return response.data;
}
