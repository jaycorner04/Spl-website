import axiosInstance from "./axiosConfig";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export async function getAdminShell() {
  const response = await axiosInstance.get("/api/admin/shell/");
  return response.data;
}

export async function uploadAdminAvatar(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await axiosInstance.post("/api/uploads/admin-avatar/", {
    fileName: file.name,
    contentType: file.type,
    dataUrl,
  });

  return response.data;
}

export async function updateAdminShellProfile(payload) {
  const response = await axiosInstance.patch("/api/admin/shell/profile/", payload);
  return response.data;
}
