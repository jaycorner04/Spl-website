export function getApiErrorMessage(error, fallbackMessage) {
  if (error?.code === "ERR_NETWORK") {
    return "Backend server is not reachable. Please check the API server.";
  }

  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}
