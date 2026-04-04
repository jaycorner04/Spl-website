import axiosInstance from "./axiosConfig";
import { notifyFranchisesUpdated } from "../utils/franchiseSync";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function getFranchises() {
  try {
    const response = await axiosInstance.get("/api/franchises/");
    return response.data;
  } catch (error) {
    console.error("Franchise API error:", error);
    throw error;
  }
}

export async function createFranchise(payload) {
  const response = await axiosInstance.post("/api/franchises/", payload);
  notifyFranchisesUpdated();
  return response.data;
}

export async function updateFranchise(id, payload) {
  const response = await axiosInstance.put(`/api/franchises/${id}/`, payload);
  notifyFranchisesUpdated();
  return response.data;
}

export async function patchFranchise(id, payload) {
  const response = await axiosInstance.patch(`/api/franchises/${id}/`, payload);
  notifyFranchisesUpdated();
  return response.data;
}

export async function deleteFranchise(id) {
  await axiosInstance.delete(`/api/franchises/${id}/`);
  notifyFranchisesUpdated();
}

export async function uploadFranchiseLogo(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await axiosInstance.post("/api/uploads/franchise-logo/", {
    fileName: file.name,
    contentType: file.type,
    dataUrl,
  });

  return response.data;
}

export async function getFranchiseDashboardSummary(params = {}) {
  const response = await axiosInstance.get("/api/franchise/summary/", { params });
  return response.data;
}

export async function getFranchiseDashboardNextMatch(params = {}) {
  const response = await axiosInstance.get("/api/franchise/next-match/", {
    params,
  });
  return response.data;
}

export async function getFranchiseDashboardNotices(params = {}) {
  const response = await axiosInstance.get("/api/franchise/notices/", { params });
  return response.data;
}

export async function getFranchiseDashboardSquadSummary(params = {}) {
  const response = await axiosInstance.get("/api/franchise/squad-summary/", {
    params,
  });
  return response.data;
}

export async function getFranchiseDashboardBudgetTrend(params = {}) {
  const response = await axiosInstance.get("/api/franchise/budget-trend/", {
    params,
  });
  return response.data;
}
