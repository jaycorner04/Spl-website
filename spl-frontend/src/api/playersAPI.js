import axiosInstance from "./axiosConfig";
import { notifyPlayersUpdated } from "../utils/playerSync";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function getPlayers(params = {}) {
  try {
    const response = await axiosInstance.get("/api/players/", { params });
    return response.data;
  } catch (error) {
    console.error("Players API error:", error);
    throw error;
  }
}

export async function createPlayer(payload) {
  const response = await axiosInstance.post("/api/players/", payload);
  notifyPlayersUpdated();
  return response.data;
}

export async function updatePlayer(id, payload) {
  const response = await axiosInstance.put(`/api/players/${id}/`, payload);
  notifyPlayersUpdated();
  return response.data;
}

export async function patchPlayer(id, payload) {
  const response = await axiosInstance.patch(`/api/players/${id}/`, payload);
  notifyPlayersUpdated();
  return response.data;
}

export async function deletePlayer(id) {
  await axiosInstance.delete(`/api/players/${id}/`);
  notifyPlayersUpdated();
}

export async function uploadPlayerPhoto(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await axiosInstance.post("/api/uploads/player-photo/", {
    fileName: file.name,
    contentType: file.type,
    dataUrl,
  });

  return response.data;
}
