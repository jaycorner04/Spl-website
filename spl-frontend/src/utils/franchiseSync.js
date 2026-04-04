export const FRANCHISES_UPDATED_EVENT = "spl:franchises-updated";
export const FRANCHISES_UPDATED_STORAGE_KEY = "spl:franchises-updated-at";

export function notifyFranchisesUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FRANCHISES_UPDATED_EVENT));
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(
      FRANCHISES_UPDATED_STORAGE_KEY,
      String(Date.now())
    );
  }
}
