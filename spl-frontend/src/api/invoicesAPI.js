import axiosInstance from "./axiosConfig";

export async function getInvoices(params = {}) {
  const response = await axiosInstance.get("/api/invoices/", { params });
  return response.data;
}

export async function patchInvoice(id, payload) {
  const response = await axiosInstance.patch(`/api/invoices/${id}/`, payload);
  return response.data;
}

export async function updateInvoice(id, payload) {
  const response = await axiosInstance.put(`/api/invoices/${id}/`, payload);
  return response.data;
}
