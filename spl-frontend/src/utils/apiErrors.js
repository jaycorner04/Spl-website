export function getApiErrorMessage(error, fallbackMessage) {
  if (error?.code === "ERR_NETWORK") {
    return "Backend server is not reachable. Please check the API server.";
  }

  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (
    typeof error?.message === "string" &&
    /reading ['"]role['"]/i.test(error.message)
  ) {
    return "Sign-in completed, but the account details were incomplete. Please refresh once and try again.";
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}
