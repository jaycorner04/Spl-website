import axiosInstance from "./axiosConfig";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function getHomeContent() {
  const response = await axiosInstance.get("/api/home/");
  return response.data;
}

export async function getAnnouncements() {
  const response = await axiosInstance.get("/api/home/announcements/");
  return response.data;
}

export async function getStandings() {
  const response = await axiosInstance.get("/api/home/standings/");
  return response.data;
}

export async function getTopPerformersContent() {
  const response = await axiosInstance.get("/api/home/top-performers/");
  return response.data;
}

export async function getLatestNews() {
  const response = await axiosInstance.get("/api/home/latest-news/");
  return response.data;
}

export async function getSponsors() {
  const response = await axiosInstance.get("/api/home/sponsors/");
  return response.data;
}

export async function updateSponsors(payload) {
  const response = await axiosInstance.patch("/api/home/sponsors/", payload);
  return response.data;
}

export async function uploadSponsorLogo(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await axiosInstance.post("/api/uploads/sponsor-logo/", {
    fileName: file.name,
    contentType: file.type,
    dataUrl,
  });

  return response.data;
}
