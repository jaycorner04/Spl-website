import axiosInstance from "./axiosConfig";

export async function getVenues() {
  try {
    const response = await axiosInstance.get("/api/venues/");
    return response.data;
  } catch (error) {
    console.error("Venues API error:", error);
    throw error;
  }
}