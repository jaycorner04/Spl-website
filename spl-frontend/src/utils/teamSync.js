export const TEAMS_UPDATED_EVENT = "spl:teams-updated";
export const TEAMS_UPDATED_STORAGE_KEY = "spl:teams-updated-at";

export function notifyTeamsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TEAMS_UPDATED_EVENT));
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(
      TEAMS_UPDATED_STORAGE_KEY,
      String(Date.now())
    );
  }
}

