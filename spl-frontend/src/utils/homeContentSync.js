export const HOME_CONTENT_UPDATED_EVENT = "spl:home-content-updated";
export const HOME_CONTENT_UPDATED_STORAGE_KEY = "spl:home-content-updated-at";

export function notifyHomeContentUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HOME_CONTENT_UPDATED_EVENT));
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(
      HOME_CONTENT_UPDATED_STORAGE_KEY,
      String(Date.now())
    );
  }
}
