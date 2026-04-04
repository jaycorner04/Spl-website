import axiosInstance from "./axiosConfig";

export async function getAdminShell() {
  const response = await axiosInstance.get("/api/admin/shell/");
  return response.data;
}
