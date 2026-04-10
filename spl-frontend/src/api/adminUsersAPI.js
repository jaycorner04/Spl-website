import axiosInstance from "./axiosConfig";

export async function getAdminUsers() {
  const response = await axiosInstance.get("/api/admin/users/");
  return response.data;
}

export async function updateAdminUserAccess(userId, payload) {
  const response = await axiosInstance.patch(
    `/api/admin/users/${userId}/`,
    payload
  );
  return response.data;
}
