import axiosInstance from "./axiosConfig";

export async function getFixtures() {
  const response = await axiosInstance.get("/api/matches/");
  return response.data;
}

export async function createFixture(payload) {
  const response = await axiosInstance.post("/api/matches/", payload);
  return response.data;
}

export async function updateFixture(id, payload) {
  const response = await axiosInstance.put(`/api/matches/${id}/`, payload);
  return response.data;
}

export async function deleteFixture(id) {
  await axiosInstance.delete(`/api/matches/${id}/`);
}
