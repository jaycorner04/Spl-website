import axiosInstance from "./axiosConfig";

export async function getAuctions(params = {}) {
  const response = await axiosInstance.get("/api/auctions/", { params });
  return response.data;
}

export async function createAuction(payload) {
  const response = await axiosInstance.post("/api/auctions/", payload);
  return response.data;
}

export async function updateAuction(id, payload) {
  const response = await axiosInstance.put(`/api/auctions/${id}/`, payload);
  return response.data;
}

export async function patchAuction(id, payload) {
  const response = await axiosInstance.patch(`/api/auctions/${id}/`, payload);
  return response.data;
}

export async function deleteAuction(id) {
  const response = await axiosInstance.delete(`/api/auctions/${id}/`);
  return response.data;
}
