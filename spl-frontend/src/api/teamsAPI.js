import axiosInstance from "./axiosConfig";
import { notifyTeamsUpdated } from "../utils/teamSync";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function getTeams(params = {}) {
  try {
    const response = await axiosInstance.get("/api/teams/", { params });
    return response.data;
  } catch (error) {
    console.error("Teams API error:", error);
    throw error;
  }
}

export async function createTeam(payload) {
  const response = await axiosInstance.post("/api/teams/", payload);
  notifyTeamsUpdated();
  return response.data;
}

export async function updateTeam(id, payload) {
  const response = await axiosInstance.put(`/api/teams/${id}/`, payload);
  notifyTeamsUpdated();
  return response.data;
}

export async function patchTeam(id, payload) {
  const response = await axiosInstance.patch(`/api/teams/${id}/`, payload);
  notifyTeamsUpdated();
  return response.data;
}

export async function deleteTeam(id) {
  await axiosInstance.delete(`/api/teams/${id}/`);
  notifyTeamsUpdated();
}

export async function uploadTeamLogo(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await axiosInstance.post("/api/uploads/team-logo/", {
    fileName: file.name,
    contentType: file.type,
    dataUrl,
  });

  return response.data;
}
