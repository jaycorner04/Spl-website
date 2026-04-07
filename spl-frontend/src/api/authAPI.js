import axiosInstance from "./axiosConfig";

function normalizeAuthResponse(payload) {
  const candidate =
    payload?.user && payload?.token
      ? payload
      : payload?.data?.user && payload?.data?.token
      ? payload.data
      : null;

  if (!candidate?.token || !candidate?.user || !candidate?.user?.role) {
    const error = new Error(
      payload?.detail ||
        payload?.message ||
        "Sign-in response is incomplete. Please try again."
    );
    error.code = "INVALID_AUTH_RESPONSE";
    error.payload = payload;
    throw error;
  }

  return candidate;
}

export async function loginUser(payload) {
  const response = await axiosInstance.post("/api/auth/login/", payload);
  return normalizeAuthResponse(response.data);
}

export async function registerUser(payload) {
  const response = await axiosInstance.post("/api/auth/register/", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await axiosInstance.get("/api/auth/me/");
  return response.data?.user ? response.data : { user: null };
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
