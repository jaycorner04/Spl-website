export const APPROVALS_UPDATED_EVENT = "spl:approvals-updated";
export const APPROVALS_UPDATED_STORAGE_KEY = "spl:approvals-updated-at";

export function notifyApprovalsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APPROVALS_UPDATED_EVENT));
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(
      APPROVALS_UPDATED_STORAGE_KEY,
      String(Date.now())
    );
  }
}
