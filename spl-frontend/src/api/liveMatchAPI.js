import axiosInstance from "./axiosConfig";

export async function getLiveMatch() {
  const response = await axiosInstance.get("/api/live-match/");
  return response.data;
}

export async function updateLiveMatch(payload) {
  const response = await axiosInstance.put("/api/live-match/", payload);
  return response.data;
}
