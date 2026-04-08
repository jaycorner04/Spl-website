import axiosInstance from "./axiosConfig";
import { getFranchises } from "./franchiseAPI";
import { getTeams } from "./teamsAPI";
import { notifyHomeContentUpdated } from "../utils/homeContentSync";

const HOME_CONTENT_TIMEOUT_MS = 10000;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function getArrayOrNull(value) {
  return Array.isArray(value) ? value : null;
}

function shouldHydrateCollection(collection) {
  return !Array.isArray(collection) || collection.length === 0;
}

async function getSupplementalCollections() {
  const [teamsResult, franchisesResult] = await Promise.allSettled([
    getTeams(),
    getFranchises(),
  ]);

  return {
    teams:
      teamsResult.status === "fulfilled"
        ? getArrayOrNull(teamsResult.value)
        : null,
    franchises:
      franchisesResult.status === "fulfilled"
        ? getArrayOrNull(franchisesResult.value)
        : null,
  };
}

export async function getHomeContent() {
  const supplementalCollectionsPromise = getSupplementalCollections();
  let homePayload = {};
  let homeRequestError = null;

  try {
    const response = await axiosInstance.get("/api/home/", {
      timeout: HOME_CONTENT_TIMEOUT_MS,
    });
    homePayload =
      response.data && typeof response.data === "object" ? response.data : {};
  } catch (error) {
    homeRequestError = error;
  }

  const shouldLoadFallbackCollections =
    shouldHydrateCollection(homePayload.teams) ||
    shouldHydrateCollection(homePayload.franchises);

  if (shouldLoadFallbackCollections) {
    const supplementalCollections = await supplementalCollectionsPromise;

    if (Array.isArray(supplementalCollections.teams)) {
      homePayload.teams = supplementalCollections.teams;
    }

    if (Array.isArray(supplementalCollections.franchises)) {
      homePayload.franchises = supplementalCollections.franchises;
    }
  }

  const hasCollectionFallbackData =
    Array.isArray(homePayload.teams) || Array.isArray(homePayload.franchises);

  if (homeRequestError && !hasCollectionFallbackData) {
    throw homeRequestError;
  }

  return homePayload;
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
  notifyHomeContentUpdated();
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
