const AUTH_TOKEN_KEY = "spl_auth_token";
const AUTH_USER_KEY = "spl_auth_user";

const ADMIN_ROLES = new Set([
  "super_admin",
  "ops_manager",
  "scorer",
  "finance_admin",
]);

const FRANCHISE_ROLES = new Set(["super_admin", "franchise_admin"]);

const ROLE_DEFAULT_PATHS = {
  super_admin: "/admin",
  ops_manager: "/admin/matches",
  scorer: "/admin/live-match",
  finance_admin: "/admin/finance",
  franchise_admin: "/franchise",
  fan_user: "/",
};

const ROLE_ALLOWED_PATHS = {
  super_admin: [
    "/admin",
    "/admin/analytics",
    "/admin/franchises",
    "/admin/sponsors",
    "/admin/matches",
    "/admin/players",
    "/admin/teams",
    "/admin/auction",
    "/admin/live-match",
    "/admin/finance",
    "/admin/approvals",
    "/franchise",
  ],
  ops_manager: ["/admin/matches", "/admin/live-match"],
  scorer: ["/admin/live-match"],
  finance_admin: ["/admin/finance"],
  franchise_admin: ["/franchise"],
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function pathMatches(pathname = "", allowedPath = "") {
  return pathname === allowedPath || pathname.startsWith(`${allowedPath}/`);
}

function decodeTokenPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function parseStoredUser(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

export function saveAuthSession(session) {
  if (!isBrowser() || !session?.token || !session?.user?.role) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function updateStoredAuthUser(partialUser = {}) {
  if (!isBrowser()) {
    return;
  }

  const currentUser = parseStoredUser(window.localStorage.getItem(AUTH_USER_KEY));

  if (!currentUser) {
    return;
  }

  window.localStorage.setItem(
    AUTH_USER_KEY,
    JSON.stringify({
      ...currentUser,
      ...partialUser,
    })
  );
}

export function getAuthToken() {
  if (!isBrowser()) {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const payload = decodeTokenPayload(token);

  if (!token || !payload?.exp || Number(payload.exp) <= Date.now()) {
    clearAuthSession();
    return null;
  }

  return token;
}

export function getAuthUser() {
  if (!isBrowser()) {
    return null;
  }

  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const payload = decodeTokenPayload(token);
  const user = parseStoredUser(window.localStorage.getItem(AUTH_USER_KEY));

  if (!user?.role) {
    clearAuthSession();
    return null;
  }

  return {
    ...user,
    id: user.id ?? payload?.sub ?? null,
    email: user.email ?? payload?.email ?? "",
    role: user.role ?? payload?.role ?? "",
    franchiseId: user.franchiseId ?? payload?.franchiseId ?? null,
    avatar: user.avatar ?? "",
  };
}

export function getDefaultPostLoginPath(role) {
  return ROLE_DEFAULT_PATHS[role] || "/";
}

export function getAllowedDashboardPaths(role) {
  return ROLE_ALLOWED_PATHS[role] || [];
}

export function isAuthorizedForPath(pathname, user) {
  if (!user?.role) {
    return false;
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/franchise")) {
    return true;
  }

  const allowedPaths = getAllowedDashboardPaths(user.role);

  if (allowedPaths.length === 0) {
    return false;
  }

  return allowedPaths.some((allowedPath) => pathMatches(pathname, allowedPath));
}
