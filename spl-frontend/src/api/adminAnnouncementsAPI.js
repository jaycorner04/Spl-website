import axiosInstance from "./axiosConfig";
import { notifyHomeContentUpdated } from "../utils/homeContentSync";

export async function getMaintenanceAnnouncement() {
  const response = await axiosInstance.get("/api/admin/announcements/maintenance/");
  return response.data;
}

export async function updateMaintenanceAnnouncement(payload) {
  const response = await axiosInstance.patch(
    "/api/admin/announcements/maintenance/",
    payload
  );
  notifyHomeContentUpdated();
  return response.data;
}
