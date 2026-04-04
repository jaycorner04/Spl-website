import axiosInstance from "./axiosConfig";

export async function loginUser(payload) {
  const response = await axiosInstance.post("/api/auth/login/", payload);
  return response.data;
}

export async function registerUser(payload) {
  const response = await axiosInstance.post("/api/auth/register/", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await axiosInstance.get("/api/auth/me/");
  return response.data;
}

export async function requestPasswordReset(payload) {
  const response = await axiosInstance.post("/api/auth/forgot-password/", payload);
  return response.data;
}

export async function resetPassword(payload) {
  const response = await axiosInstance.post("/api/auth/reset-password/", payload);
  return response.data;
}

export async function logoutUser() {
  const response = await axiosInstance.post("/api/auth/logout/");
  return response.data;
}
