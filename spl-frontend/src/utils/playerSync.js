export const PLAYERS_UPDATED_EVENT = "spl:players-updated";
export const PLAYERS_UPDATED_STORAGE_KEY = "spl:players-updated-at";

export function notifyPlayersUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLAYERS_UPDATED_EVENT));
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(
      PLAYERS_UPDATED_STORAGE_KEY,
      String(Date.now())
    );
  }
}
