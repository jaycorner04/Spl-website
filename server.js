const http = require("http");
const path = require("path");
const { existsSync } = require("fs");
const { mkdir, readFile, writeFile } = require("fs/promises");

const { PROJECT_DATA_CONFIG, RESOURCE_CONFIG } = require("./dataConfig");
const { loadEnvConfig, parseBoolean, parseCsv, validateServerEnv } = require("./envConfig");
const { getAdminAnalyticsPayload } = require("./adminAnalyticsService");
const { getAdminDashboardSection } = require("./adminDashboardService");
const { getAdminShellPayload } = require("./adminShellService");
const {
  getFranchiseDashboardSection,
  getFranchiseSearchPayload,
} = require("./franchiseDashboardService");
const { getTopPerformers } = require("./topPerformersService");
const {
  createAuditLog,
  createItem,
  deleteItem,
  getDatabaseHealth,
  getItem,
  getProjectData,
  initializeDatabase,
  listAuditLogs,
  listCollection,
  replaceItem,
  setProjectData,
} = require("./db");
const {
  canAccessFranchiseDashboard,
  getUserFromAuthorizationHeader,
  isPlatformAdmin,
  isPrivilegedUser,
  listAdminUsers,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  syncFranchiseRegistrationApproval,
  updateAdminUserAccess,
  updateUserAvatar,
} = require("./authService");

loadEnvConfig();

const PORT = Number.parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const API_VERSION = "1.12.0";
const SERVER_START_TIME = Date.now();
const MEDIA_DIR = path.join(__dirname, "server-media");
const FRONTEND_DIST_DIR = path.join(__dirname, "spl-frontend", "dist");
const FRONTEND_INDEX_PATH = path.join(FRONTEND_DIST_DIR, "index.html");
const MAX_BODY_SIZE = 10 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const SAME_ORIGIN_CORS_TOKENS = new Set(["self", "same-origin", "same_origin"]);
const parsedAllowedOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS || "");
const CORS_ALLOW_SAME_ORIGIN = parsedAllowedOrigins.some((value) =>
  SAME_ORIGIN_CORS_TOKENS.has(String(value).trim().toLowerCase())
);
const CORS_ALLOWED_ORIGINS = new Set(
  parsedAllowedOrigins.filter(
    (value) => !SAME_ORIGIN_CORS_TOKENS.has(String(value).trim().toLowerCase())
  )
);
const RATE_LIMIT_ENABLED = parseBoolean(
  process.env.RATE_LIMIT_ENABLED,
  NODE_ENV === "production"
);
const IMAGE_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const NON_NEGATIVE_NUMBER_FIELDS = new Set([
  "budget_left",
  "salary",
  "matches",
  "runs",
  "wickets",
  "batting_average",
  "strike_rate",
  "economy",
  "fours",
  "sixes",
  "dot_ball_percentage",
  "catches",
  "stumpings",
  "capacity",
  "amount",
  "base_price",
  "sold_price",
  "bid_round",
]);
const EMAIL_FIELDS = new Set(["email"]);
const PHONE_FIELDS = new Set(["mobile", "contact_phone"]);
const URL_FIELDS = new Set(["website"]);
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const RATE_LIMIT_RULES = [
  {
    key: "auth",
    windowMs: 15 * 60 * 1000,
    max: 25,
    match: (pathname, method) =>
      method === "POST" &&
      [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
      ].includes(pathname),
  },
  {
    key: "admin-search",
    windowMs: 60 * 1000,
    max: 120,
    match: (pathname, method) =>
      method === "GET" && pathname === "/api/admin/search",
  },
  {
    key: "uploads",
    windowMs: 60 * 1000,
    max: 20,
    match: (pathname, method) =>
      method === "POST" && pathname.startsWith("/api/uploads/"),
  },
];
const rateLimitStore = new Map();
const requestMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  rateLimitedRequests: 0,
  methodCounts: {},
  routeCounts: {},
  statusCounts: {},
  totalResponseTimeMs: 0,
};
const PLAYER_APPROVAL_META_PREFIX = "__SPL_PLAYER_REG__";

function getRequestOrigin(response) {
  return String(response.__request?.headers?.origin || "").trim();
}

function getRequestBaseOrigin(response) {
  const request = response.__request;

  if (!request) {
    return "";
  }

  const forwardedProto = String(request.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol =
    forwardedProto ||
    (request.socket?.encrypted ? "https" : "http");
  const host = String(
    request.headers["x-forwarded-host"] || request.headers.host || ""
  )
    .split(",")[0]
    .trim();

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

function resolveCorsOrigin(response) {
  const requestOrigin = getRequestOrigin(response);

  if (!CORS_ALLOW_SAME_ORIGIN && CORS_ALLOWED_ORIGINS.size === 0) {
    return requestOrigin || "*";
  }

  if (!requestOrigin) {
    return null;
  }

  if (CORS_ALLOWED_ORIGINS.has(requestOrigin)) {
    return requestOrigin;
  }

  if (CORS_ALLOW_SAME_ORIGIN) {
    const requestBaseOrigin = getRequestBaseOrigin(response);

    if (requestBaseOrigin && requestBaseOrigin === requestOrigin) {
      return requestOrigin;
    }
  }

  return null;
}

function buildResponseHeaders(response, extraHeaders = {}) {
  const headers = {
    ...SECURITY_HEADERS,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    ...extraHeaders,
  };
  const corsOrigin = resolveCorsOrigin(response);

  if (corsOrigin) {
    headers["Access-Control-Allow-Origin"] = corsOrigin;
    headers.Vary = "Origin";
  }

  return headers;
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, buildResponseHeaders(response, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  }));
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, detail, extraHeaders = {}) {
  sendJson(response, statusCode, { detail }, extraHeaders);
}

function sendEmpty(response, statusCode = 204, extraHeaders = {}) {
  response.writeHead(statusCode, buildResponseHeaders(response, extraHeaders));
  response.end();
}

function serializeAuditDetail(detail) {
  if (detail == null || detail === "") {
    return "";
  }

  if (typeof detail === "string") {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch (error) {
    return String(detail);
  }
}

async function appendAuditLogSafe(
  request,
  {
    user = null,
    action,
    resourceName,
    resourceId = null,
    method,
    status = "success",
    detail = "",
  }
) {
  try {
    const resolvedUser =
      user ||
      (await getUserFromAuthorizationHeader(request.headers.authorization));

    await createAuditLog({
      actorUserId: resolvedUser?.id ?? null,
      actorEmail: resolvedUser?.email || "anonymous",
      actorRole: resolvedUser?.role || "anonymous",
      action,
      resourceName,
      resourceId,
      method: method || request.method,
      status,
      detail: serializeAuditDetail(detail),
      ipAddress: getClientIp(request),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to append audit log:", error);
  }
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function canServeFrontend() {
  return existsSync(FRONTEND_INDEX_PATH);
}

function getStaticMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".aab": "application/octet-stream",
    ".apk": "application/vnd.android.package-archive",
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".htm": "text/html; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
  };

  return mimeTypes[extension] || "application/octet-stream";
}

async function sendStaticFile(response, filePath, cacheControl = "public, max-age=3600") {
  const fileContent = await readFile(filePath);
  response.writeHead(200, buildResponseHeaders(response, {
    "Content-Type": getStaticMimeType(filePath),
    "Cache-Control": cacheControl,
  }));
  response.end(fileContent);
}

async function tryServeFrontend(pathname, request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (!canServeFrontend()) {
    return false;
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/media/")) {
    return false;
  }

  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const relativePath = requestPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(FRONTEND_DIST_DIR, relativePath);

  if (!resolvedPath.startsWith(FRONTEND_DIST_DIR)) {
    sendError(response, 404, "Static file not found.");
    return true;
  }

  if (path.extname(relativePath)) {
    if (!existsSync(resolvedPath)) {
      sendError(response, 404, "Static file not found.");
      return true;
    }

    await sendStaticFile(response, resolvedPath);
    return true;
  }

  await sendStaticFile(response, FRONTEND_INDEX_PATH, "no-store");
  return true;
}

function getClientIp(request) {
  const forwardedFor = String(request.headers["x-forwarded-for"] || "")
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean);

  return (
    forwardedFor ||
    String(request.socket?.remoteAddress || "").trim() ||
    "unknown"
  );
}

function getRateLimitRule(pathname, method) {
  return RATE_LIMIT_RULES.find((rule) => rule.match(pathname, method)) || null;
}

function consumeRateLimit(request, pathname) {
  if (!RATE_LIMIT_ENABLED) {
    return null;
  }

  const rule = getRateLimitRule(pathname, request.method);

  if (!rule) {
    return null;
  }

  const now = Date.now();
  const bucketKey = `${rule.key}:${getClientIp(request)}`;
  const bucket = rateLimitStore.get(bucketKey) || [];
  const activeWindow = bucket.filter(
    (timestamp) => now - timestamp < rule.windowMs
  );

  if (activeWindow.length >= rule.max) {
    requestMetrics.rateLimitedRequests += 1;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rule.windowMs - (now - activeWindow[0])) / 1000)
    );

    rateLimitStore.set(bucketKey, activeWindow);
    return {
      retryAfterSeconds,
      message:
        "Too many requests were received from this client. Please slow down and try again shortly.",
    };
  }

  activeWindow.push(now);
  rateLimitStore.set(bucketKey, activeWindow);
  return null;
}

function isMonitoringAuthorized(request) {
  const monitoringToken = String(process.env.SPL_MONITORING_TOKEN || "").trim();

  if (!monitoringToken) {
    return NODE_ENV !== "production";
  }

  const headerToken = String(request.headers["x-monitoring-token"] || "").trim();
  return headerToken === monitoringToken;
}

function getMetricsSnapshot() {
  const averageResponseTimeMs =
    requestMetrics.totalRequests > 0
      ? Number(
          (requestMetrics.totalResponseTimeMs / requestMetrics.totalRequests).toFixed(2)
        )
      : 0;

  return {
    version: API_VERSION,
    environment: NODE_ENV,
    uptimeSeconds: Number(((Date.now() - SERVER_START_TIME) / 1000).toFixed(2)),
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
    },
    http: {
      totalRequests: requestMetrics.totalRequests,
      totalErrors: requestMetrics.totalErrors,
      rateLimitedRequests: requestMetrics.rateLimitedRequests,
      averageResponseTimeMs,
      methodCounts: requestMetrics.methodCounts,
      routeCounts: requestMetrics.routeCounts,
      statusCounts: requestMetrics.statusCounts,
    },
  };
}

async function parseBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > MAX_BODY_SIZE) {
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      if (!rawBody.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function sanitizeFileName(fileName = "") {
  const parsedName = path.parse(String(fileName || "").trim());
  const normalized = (parsedName.name || "player-photo")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized || "player-photo";
}

function parseUploadPayload(payload) {
  const dataUrl = String(payload?.dataUrl || "").trim();
  const fileName = String(payload?.fileName || "").trim();
  const dataUrlMatch = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);

  if (!fileName) {
    const error = new Error("Image file name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!dataUrlMatch) {
    const error = new Error("Image upload payload is invalid.");
    error.statusCode = 400;
    throw error;
  }

  const [, contentType, base64Content] = dataUrlMatch;
  const normalizedContentType = contentType.toLowerCase();
  const extension =
    IMAGE_EXTENSION_MAP[normalizedContentType] ||
    IMAGE_EXTENSION_MAP[String(payload?.contentType || "").toLowerCase()];

  if (!extension) {
    const error = new Error("Only JPG, PNG, and WEBP images are supported.");
    error.statusCode = 400;
    throw error;
  }

  let buffer;

  try {
    buffer = Buffer.from(base64Content, "base64");
  } catch (error) {
    const uploadError = new Error("Unable to decode the uploaded image.");
    uploadError.statusCode = 400;
    throw uploadError;
  }

  if (!buffer || buffer.length === 0) {
    const error = new Error("Uploaded image is empty.");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_UPLOAD_SIZE) {
    const error = new Error("Image must be 5 MB or smaller.");
    error.statusCode = 413;
    throw error;
  }

  return {
    buffer,
    extension,
    fileName: sanitizeFileName(fileName),
  };
}

async function saveImageUpload(payload, folderName, defaultBaseName) {
  const upload = parseUploadPayload(payload);
  const mediaDirectory = path.join(MEDIA_DIR, folderName);
  const uniqueSuffix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const baseName = upload.fileName || defaultBaseName;
  const savedFileName = `${baseName}-${uniqueSuffix}${upload.extension}`;
  const absolutePath = path.join(mediaDirectory, savedFileName);

  await mkdir(mediaDirectory, { recursive: true });
  await writeFile(absolutePath, upload.buffer);

  return {
    fileName: savedFileName,
    path: `/media/${folderName}/${savedFileName}`,
  };
}

async function savePlayerPhotoUpload(payload) {
  return saveImageUpload(payload, "players", "player-photo");
}

async function saveTeamLogoUpload(payload) {
  return saveImageUpload(payload, "teams", "team-logo");
}

async function saveFranchiseLogoUpload(payload) {
  return saveImageUpload(payload, "franchises", "franchise-logo");
}

async function saveSponsorLogoUpload(payload) {
  return saveImageUpload(payload, "sponsors", "sponsor-logo");
}

async function saveAdminAvatarUpload(payload) {
  return saveImageUpload(payload, "avatars", "admin-avatar");
}

function buildHomeStandingsRows(sourceRows, teams) {
  const normalizedSourceRows = Array.isArray(sourceRows) ? sourceRows : [];
  const knownTeamNames = new Set(
    normalizedSourceRows.map((row) => String(row?.team || "").toLowerCase())
  );

  const appendedRows = (Array.isArray(teams) ? teams : [])
    .filter(
      (team) => !knownTeamNames.has(String(team?.team_name || "").toLowerCase())
    )
    .sort((left, right) =>
      String(left?.team_name || "").localeCompare(String(right?.team_name || ""))
    )
    .map((team, index) => ({
      pos: normalizedSourceRows.length + index + 1,
      team: team.team_name,
      played: 0,
      won: 0,
      lost: 0,
      nrr: "0.000",
      pts: 0,
    }));

  return [...normalizedSourceRows, ...appendedRows].map((row, index) => ({
    ...row,
    pos: index + 1,
  }));
}

async function validateTeamFranchiseAssignment(teamId, teamRecord) {
  if (!teamRecord || typeof teamRecord !== "object") {
    return null;
  }

  const franchiseId = Number.parseInt(teamRecord.franchise_id, 10);

  if (!Number.isInteger(franchiseId) || franchiseId < 1) {
    return null;
  }

  const [franchises, teams] = await Promise.all([
    listCollection("franchises"),
    listCollection("teams"),
  ]);

  const hasMatchingFranchise = franchises.some(
    (franchise) => Number(franchise.id) === franchiseId
  );

  if (!hasMatchingFranchise) {
    return "Selected franchise was not found.";
  }

  const assignedTeams = teams.filter(
    (team) =>
      Number(team.franchise_id) === franchiseId &&
      Number(team.id) !== Number(teamId || 0)
  );

  if (assignedTeams.length >= 3) {
    return "A franchise can only own up to 3 teams.";
  }

  return null;
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function isValidPhoneNumber(value) {
  return /^[0-9+\-\s()]{10,18}$/.test(String(value || ""));
}

function isValidWebsiteUrl(value) {
  try {
    const parsedUrl = new URL(String(value || ""));
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch (error) {
    return false;
  }
}

function validateFieldSemantics(key, value, rule) {
  if (rule.type === "number") {
    if (NON_NEGATIVE_NUMBER_FIELDS.has(key) && value < 0) {
      return `"${key}" cannot be negative.`;
    }

    return null;
  }

  if (!value) {
    return null;
  }

  if (EMAIL_FIELDS.has(key) && !isValidEmailAddress(value)) {
    return `"${key}" must be a valid email address.`;
  }

  if (PHONE_FIELDS.has(key) && !isValidPhoneNumber(value)) {
    return `"${key}" must be a valid phone number.`;
  }

  if (URL_FIELDS.has(key) && !isValidWebsiteUrl(value)) {
    return `"${key}" must be a valid website URL starting with http:// or https://.`;
  }

  return null;
}

async function validateResourceRelationships(resourceName, record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  if (resourceName === "teams") {
    return validateTeamFranchiseAssignment(record.id || null, record);
  }

  if (resourceName === "players") {
    if (!record.team_id) {
      return null;
    }

    const teams = await listCollection("teams");
    const team = teams.find((entry) => Number(entry.id) === Number(record.team_id));

    if (!team) {
      return "Selected team was not found for this player.";
    }

    if (
      record.team_name &&
      String(record.team_name).trim().toLowerCase() !==
        String(team.team_name || "").trim().toLowerCase()
    ) {
      return "Player team name must match the selected team.";
    }

    record.team_name = team.team_name;
    return null;
  }

  if (resourceName === "performances") {
    const players = await listCollection("players");
    const player = players.find(
      (entry) => Number(entry.id) === Number(record.player_id)
    );

    if (!player) {
      return "Selected player was not found for this performance.";
    }

    record.player_name = player.full_name || record.player_name;
    record.team_id = player.team_id ?? record.team_id;
    record.team_name = player.team_name || record.team_name;
    return null;
  }

  if (resourceName === "matches") {
    if (
      String(record.teamA || "").trim().toLowerCase() &&
      String(record.teamA || "").trim().toLowerCase() ===
        String(record.teamB || "").trim().toLowerCase()
    ) {
      return "A match cannot contain the same team on both sides.";
    }

    if (!record.team_a_id && !record.team_b_id) {
      return null;
    }

    const teams = await listCollection("teams");
    const teamA =
      Number(record.team_a_id) > 0
        ? teams.find((entry) => Number(entry.id) === Number(record.team_a_id))
        : null;
    const teamB =
      Number(record.team_b_id) > 0
        ? teams.find((entry) => Number(entry.id) === Number(record.team_b_id))
        : null;

    if (record.team_a_id && !teamA) {
      return "Team A was not found for this match.";
    }

    if (record.team_b_id && !teamB) {
      return "Team B was not found for this match.";
    }

    if (
      teamA &&
      teamB &&
      Number(teamA.id) === Number(teamB.id)
    ) {
      return "A match cannot contain the same team on both sides.";
    }

    if (teamA) {
      record.teamA = teamA.team_name;
    }

    if (teamB) {
      record.teamB = teamB.team_name;
    }

    return null;
  }

  if (resourceName === "auctions") {
    if (!record.team_id) {
      return null;
    }

    const teams = await listCollection("teams");
    const team = teams.find((entry) => Number(entry.id) === Number(record.team_id));

    if (!team) {
      return "Selected team was not found for this auction record.";
    }

    record.team_name = team.team_name || record.team_name;
    return null;
  }

  return null;
}

function sanitizePayload(resourceName, payload, { partial = false } = {}) {
  const config = RESOURCE_CONFIG[resourceName];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "Request body must be a JSON object." };
  }

  const sanitized = {};
  const errors = [];

  for (const [key, value] of Object.entries(payload)) {
    const rule = config.fields[key];

    if (!rule) {
      errors.push(`Unknown field "${key}".`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    if (rule.type === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`"${key}" must be a number.`);
        continue;
      }

      const semanticError = validateFieldSemantics(key, value, rule);

      if (semanticError) {
        errors.push(semanticError);
        continue;
      }

      sanitized[key] = value;
      continue;
    }

    if (typeof value !== "string") {
      errors.push(`"${key}" must be a string.`);
      continue;
    }

    const normalizedValue = value.trim();

    if (rule.required && !normalizedValue) {
      errors.push(`"${key}" cannot be empty.`);
      continue;
    }

    if (rule.allowedValues && !rule.allowedValues.includes(normalizedValue)) {
      errors.push(
        `"${key}" must be one of: ${rule.allowedValues.join(", ")}.`
      );
      continue;
    }

    const semanticError = validateFieldSemantics(
      key,
      normalizedValue,
      rule
    );

    if (semanticError) {
      errors.push(semanticError);
      continue;
    }

    sanitized[key] = normalizedValue;
  }

  if (!partial) {
    for (const [key, rule] of Object.entries(config.fields)) {
      if (rule.required && !(key in sanitized)) {
        errors.push(`"${key}" is required.`);
      }
    }
  }

  if (errors.length > 0) {
    return { error: errors.join(" ") };
  }

  return { value: sanitized };
}

function applyListFilters(resourceName, records, searchParams) {
  const config = RESOURCE_CONFIG[resourceName];
  let filtered = [...records];
  const search = searchParams.get("search");

  if (search) {
    const normalizedSearch = search.toLowerCase();

    filtered = filtered.filter((record) =>
      config.searchFields.some((field) =>
        String(record[field] || "")
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }

  for (const filter of config.filters || []) {
    const value = searchParams.get(filter.query);

    if (value) {
      filtered = filter.apply(filtered, value);
    }
  }

  const limit = Number.parseInt(searchParams.get("limit") || "", 10);

  if (Number.isInteger(limit) && limit > 0) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

function buildPlayerRegistrationApprovalNotes(playerRecord, actor) {
  const meta = JSON.stringify({
    playerId: playerRecord.id,
    playerName: playerRecord.full_name,
    teamId: playerRecord.team_id,
    teamName: playerRecord.team_name,
    role: playerRecord.role,
    squadRole: playerRecord.squad_role,
    battingStyle: playerRecord.batting_style,
    bowlingStyle: playerRecord.bowling_style,
    email: playerRecord.email,
    mobile: playerRecord.mobile,
    createdAt: playerRecord.created_at,
    franchiseId: actor?.franchiseId ?? null,
    requestedByUserId: actor?.id ?? null,
    requestedByName: actor?.fullName || "",
    requestedByEmail: actor?.email || "",
  });

  return [
    `${PLAYER_APPROVAL_META_PREFIX}${meta}`,
    `Player registration submitted for ${playerRecord.full_name}.`,
  ].join("\n");
}

function parsePlayerRegistrationApprovalNotes(notes = "") {
  const firstLine = String(notes || "").split(/\r?\n/, 1)[0] || "";

  if (!firstLine.startsWith(PLAYER_APPROVAL_META_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(firstLine.slice(PLAYER_APPROVAL_META_PREFIX.length));
  } catch (error) {
    return null;
  }
}

function buildPlayerRegistrationApproval(playerRecord, actor) {
  const createdAt = String(playerRecord.created_at || new Date().toISOString());
  const teamName = String(playerRecord.team_name || "").trim();

  return {
    request_type: "Player Registration",
    requested_by: teamName || actor?.fullName || actor?.email || "Franchise",
    subject: `Approve ${playerRecord.full_name} for ${teamName || `Team ${playerRecord.team_id}`}`,
    date: createdAt.slice(0, 10),
    priority: "High",
    status: "Pending",
    notes: buildPlayerRegistrationApprovalNotes(playerRecord, actor),
  };
}

async function createPlayerRegistrationApproval(playerRecord, actor) {
  return createItem(
    "approvals",
    buildPlayerRegistrationApproval(playerRecord, actor)
  );
}

async function syncPlayerRegistrationApproval(approvalRecord) {
  if (
    String(approvalRecord?.request_type || "").toLowerCase() !==
    "player registration"
  ) {
    return;
  }

  const meta = parsePlayerRegistrationApprovalNotes(approvalRecord.notes);

  if (!meta?.playerId) {
    return;
  }

  const playerRecord = await getItem("players", Number(meta.playerId));

  if (!playerRecord) {
    return;
  }

  const normalizedApprovalStatus = String(
    approvalRecord.status || ""
  ).toLowerCase();
  const nextPlayerStatus =
    normalizedApprovalStatus === "approved" ? "Active" : "Pending";

  if (String(playerRecord.status || "") === nextPlayerStatus) {
    return;
  }

  await replaceItem("players", playerRecord.id, {
    ...playerRecord,
    status: nextPlayerStatus,
  });
}

async function syncApprovalSideEffects(approvalRecord) {
  await syncFranchiseRegistrationApproval(approvalRecord);
  await syncPlayerRegistrationApproval(approvalRecord);
}

function parseIdentifier(rawIdentifier) {
  const id = Number.parseInt(rawIdentifier, 10);

  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  return id;
}

function buildApiIndex() {
  return {
    name: "SPL SQL API",
    version: API_VERSION,
    resources: [
      ...Object.keys(RESOURCE_CONFIG).map((resource) => ({
        resource,
        collection: `/api/${resource}/`,
        item: `/api/${resource}/:id/`,
      })),
      {
        resource: "home",
        collection: "/api/home/",
        sections: [
          "/api/home/announcements/",
          "/api/home/standings/",
          "/api/home/top-performers/",
          "/api/home/latest-news/",
          "/api/home/sponsors/",
        ],
      },
      {
        resource: "live-match",
        collection: "/api/live-match/",
      },
      {
        resource: "admin-dashboard",
        collection: "/api/admin/dashboard/",
        sections: [
          "/api/admin/dashboard/stats/",
          "/api/admin/dashboard/points-table/",
          "/api/admin/dashboard/season-progress/",
          "/api/admin/dashboard/live-now/",
          "/api/admin/dashboard/recent-activity/",
          "/api/admin/dashboard/top-performers/",
        ],
      },
      {
        resource: "admin-search",
        collection: "/api/admin/search/",
      },
      {
        resource: "admin-analytics",
        collection: "/api/admin/analytics/",
      },
      {
        resource: "admin-shell",
        collection: "/api/admin/shell/",
      },
      {
        resource: "admin-audit-logs",
        collection: "/api/admin/audit-logs/",
      },
      {
        resource: "auth",
        routes: [
          "/api/auth/register/",
          "/api/auth/login/",
          "/api/auth/me/",
          "/api/auth/forgot-password/",
          "/api/auth/reset-password/",
          "/api/auth/logout/",
        ],
      },
      {
        resource: "franchise-dashboard",
        routes: [
          "/api/franchise/summary/",
          "/api/franchise/next-match/",
          "/api/franchise/notices/",
          "/api/franchise/squad-summary/",
          "/api/franchise/budget-trend/",
        ],
      },
      {
        resource: "uploads",
        routes: [
          "/api/uploads/player-photo/",
          "/api/uploads/team-logo/",
          "/api/uploads/franchise-logo/",
          "/api/uploads/sponsor-logo/",
          "/api/uploads/admin-avatar/",
        ],
      },
      {
        resource: "metrics",
        collection: "/api/metrics/",
      },
    ],
    health: "/api/health/",
  };
}

function getErrorStatusCode(error) {
  if (error?.message === "Invalid JSON body.") {
    return 400;
  }

  if (error?.message === "Request body is too large.") {
    return 413;
  }

  return Number.isInteger(error?.statusCode) ? error.statusCode : 500;
}

async function requirePrivilegedAccess(request, response) {
  const user = await getUserFromAuthorizationHeader(
    request.headers.authorization
  );

  if (!user) {
    sendError(response, 401, "Authentication is required for this action.");
    return null;
  }

  if (!isPrivilegedUser(user)) {
    sendError(response, 403, "You do not have permission for this action.");
    return null;
  }

  return user;
}

async function requirePlatformAdminAccess(request, response) {
  const user = await requirePrivilegedAccess(request, response);

  if (!user) {
    return null;
  }

  if (!isPlatformAdmin(user)) {
    sendError(response, 403, "Only platform admins can access this action.");
    return null;
  }

  return user;
}

function hasRole(user, roles = []) {
  return Boolean(user && roles.includes(user.role));
}

async function requireRoleAccess(request, response, roles, message) {
  const user = await requirePrivilegedAccess(request, response);

  if (!user) {
    return null;
  }

  if (!hasRole(user, roles)) {
    sendError(
      response,
      403,
      message || "You do not have permission for this action."
    );
    return null;
  }

  return user;
}

async function requireSuperAdminAccess(request, response, message) {
  return requireRoleAccess(
    request,
    response,
    ["super_admin"],
    message || "Only the super admin can access this action."
  );
}

async function requireMatchOperationsAccess(request, response, message) {
  return requireRoleAccess(
    request,
    response,
    ["super_admin", "ops_manager"],
    message ||
      "Only the super admin or ops manager can access match operations."
  );
}

async function requireLiveMatchControlAccess(request, response, message) {
  return requireRoleAccess(
    request,
    response,
    ["super_admin", "ops_manager", "scorer"],
    message ||
      "Only the super admin, ops manager, or scorer can control live match data."
  );
}

async function requireFinanceAccess(request, response, message) {
  return requireRoleAccess(
    request,
    response,
    ["super_admin", "finance_admin"],
    message ||
      "Only the super admin or finance admin can access finance data."
  );
}

async function requireFranchiseScopedAccess(request, response, message) {
  return requireRoleAccess(
    request,
    response,
    ["super_admin", "franchise_admin"],
    message ||
      "Only the super admin or franchise admin can access franchise management."
  );
}

async function requireFranchiseDashboardAccess(request, response) {
  const user = await requirePrivilegedAccess(request, response);

  if (!user) {
    return null;
  }

  if (!canAccessFranchiseDashboard(user)) {
    sendError(
      response,
      403,
      "Only super admins and franchise admins can access this dashboard."
    );
    return null;
  }

  return user;
}

async function requireResourceReadAccess(resourceName, request, response) {
  if (resourceName === "approvals") {
    return requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can review approvals."
    );
  }

  if (resourceName === "invoices") {
    return requireFinanceAccess(
      request,
      response,
      "Only the super admin or finance admin can access invoices."
    );
  }

  if (resourceName === "auctions" || resourceName === "performances") {
    return requireSuperAdminAccess(
      request,
      response,
      `Only the super admin can access ${resourceName}.`
    );
  }

  return { role: "public" };
}

async function ensureFranchiseScopedTeamAccess(teamId, user) {
  const team = await getItem("teams", Number(teamId));

  if (!team) {
    return { error: "Team not found." };
  }

  if (user.role !== "super_admin") {
    const franchiseId = String(user?.franchiseId || "");

    if (!franchiseId || String(team.franchise_id || "") !== franchiseId) {
      return {
        error:
          "You can only manage teams that belong to your own franchise.",
      };
    }
  }

  return { team };
}

async function requireCollectionWriteAccess(
  resourceName,
  request,
  response,
  payload
) {
  if (resourceName === "approvals" || resourceName === "auctions" || resourceName === "performances") {
    return requireSuperAdminAccess(
      request,
      response,
      `Only the super admin can create ${resourceName}.`
    );
  }

  if (resourceName === "invoices") {
    return requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can create new finance records."
    );
  }

  if (resourceName === "matches") {
    return requireMatchOperationsAccess(
      request,
      response,
      "Only the super admin or ops manager can create matches."
    );
  }

  if (resourceName === "teams") {
    const user = await requireFranchiseScopedAccess(
      request,
      response,
      "Only the super admin or franchise admin can create teams."
    );

    if (!user) {
      return null;
    }

    if (user.role === "super_admin") {
      return user;
    }

    if (
      String(payload?.franchise_id || "") !== String(user?.franchiseId || "")
    ) {
      sendError(
        response,
        403,
        "You can only create teams under your own franchise."
      );
      return null;
    }

    return user;
  }

  if (resourceName === "players") {
    const user = await requireFranchiseScopedAccess(
      request,
      response,
      "Only the super admin or franchise admin can create players."
    );

    if (!user) {
      return null;
    }

    if (user.role === "super_admin") {
      return user;
    }

    const { error } = await ensureFranchiseScopedTeamAccess(
      payload?.team_id,
      user
    );

    if (error) {
      sendError(response, 403, error);
      return null;
    }

    return user;
  }

  if (resourceName === "franchises") {
    return requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can create new franchise records."
    );
  }

  if (resourceName === "venues") {
    return requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can create venues."
    );
  }

  return requirePrivilegedAccess(request, response);
}

async function requireItemWriteAccess(
  resourceName,
  request,
  response,
  existingRecord,
  nextRecord,
  method
) {
  if (resourceName === "approvals" || resourceName === "auctions" || resourceName === "performances") {
    return requireSuperAdminAccess(
      request,
      response,
      `Only the super admin can modify ${resourceName}.`
    );
  }

  if (resourceName === "invoices") {
    if (method === "DELETE") {
      return requireSuperAdminAccess(
        request,
        response,
        "Only the super admin can delete finance records."
      );
    }

    return requireFinanceAccess(
      request,
      response,
      "Only the super admin or finance admin can update finance records."
    );
  }

  if (resourceName === "matches") {
    return requireMatchOperationsAccess(
      request,
      response,
      method === "DELETE"
        ? "Only the super admin or ops manager can delete matches."
        : "Only the super admin or ops manager can update matches."
    );
  }

  if (resourceName === "franchises") {
    const user = await requireFranchiseScopedAccess(
      request,
      response,
      "Only the super admin or franchise admin can update franchise details."
    );

    if (!user) {
      return null;
    }

    if (user.role === "super_admin") {
      return user;
    }

    if (method === "DELETE") {
      sendError(
        response,
        403,
        "Only the super admin can delete franchise records."
      );
      return null;
    }

    if (String(existingRecord.id || "") !== String(user.franchiseId || "")) {
      sendError(
        response,
        403,
        "You can only update your own franchise."
      );
      return null;
    }

    return user;
  }

  if (resourceName === "teams") {
    const user = await requireFranchiseScopedAccess(
      request,
      response,
      "Only the super admin or franchise admin can update team records."
    );

    if (!user) {
      return null;
    }

    if (user.role === "super_admin") {
      return user;
    }

    if (method === "DELETE") {
      sendError(
        response,
        403,
        "Only the super admin can delete team records."
      );
      return null;
    }

    if (
      String(existingRecord.franchise_id || "") !==
      String(user.franchiseId || "")
    ) {
      sendError(
        response,
        403,
        "You can only update teams that belong to your own franchise."
      );
      return null;
    }

    if (
      String(nextRecord.franchise_id || existingRecord.franchise_id || "") !==
      String(user.franchiseId || "")
    ) {
      sendError(
        response,
        403,
        "You cannot move a team outside your own franchise."
      );
      return null;
    }

    return user;
  }

  if (resourceName === "players") {
    const user = await requireFranchiseScopedAccess(
      request,
      response,
      "Only the super admin or franchise admin can update player records."
    );

    if (!user) {
      return null;
    }

    if (user.role === "super_admin") {
      return user;
    }

    if (method === "DELETE") {
      sendError(
        response,
        403,
        "Only the super admin can delete player records."
      );
      return null;
    }

    const { error } = await ensureFranchiseScopedTeamAccess(
      nextRecord.team_id || existingRecord.team_id,
      user
    );

    if (error) {
      sendError(response, 403, error);
      return null;
    }

    return user;
  }

  if (resourceName === "venues") {
    return requireSuperAdminAccess(
      request,
      response,
      `Only the super admin can ${method === "DELETE" ? "delete" : "update"} venues.`
    );
  }

  return requirePrivilegedAccess(request, response);
}

async function handleAuthRequest(pathname, request, response) {
  if (pathname === "/api/auth/me") {
    if (request.method !== "GET") {
      sendError(response, 405, "Method not allowed for this route.");
      return;
    }

    const user = await getUserFromAuthorizationHeader(
      request.headers.authorization
    );

    if (!user) {
      sendError(response, 401, "Authentication token is missing or invalid.");
      return;
    }

    sendJson(response, 200, { user });
    return;
  }

  if (pathname === "/api/auth/logout") {
    if (request.method !== "POST") {
      sendError(response, 405, "Method not allowed for this route.");
      return;
    }

    await appendAuditLogSafe(request, {
      action: "auth.logout",
      resourceName: "auth_users",
      status: "success",
    });
    sendJson(response, 200, {
      message: "Logged out successfully. Clear the client session token.",
    });
    return;
  }

  if (request.method !== "POST") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  try {
    const payload = await parseBody(request);

    if (pathname === "/api/auth/register") {
      const authResponse = await registerUser(payload);
      await appendAuditLogSafe(request, {
        user: authResponse.user,
        action: "auth.register",
        resourceName: "auth_users",
        resourceId: authResponse.user?.id ?? null,
        status: "success",
        detail: {
          email: authResponse.user?.email,
          role: authResponse.user?.role,
        },
      });
      sendJson(response, 201, authResponse);
      return;
    }

    if (pathname === "/api/auth/login") {
      const authResponse = await loginUser(payload);
      await appendAuditLogSafe(request, {
        user: authResponse.user,
        action: "auth.login",
        resourceName: "auth_users",
        resourceId: authResponse.user?.id ?? null,
        status: "success",
      });
      sendJson(response, 200, authResponse);
      return;
    }

    if (pathname === "/api/auth/forgot-password") {
      const resetResponse = await requestPasswordReset(payload.email);
      await appendAuditLogSafe(request, {
        action: "auth.password_reset_request",
        resourceName: "auth_users",
        status: "success",
        detail: {
          email: payload.email,
        },
      });
      sendJson(response, 200, resetResponse);
      return;
    }

    if (pathname === "/api/auth/reset-password") {
      const resetResponse = await resetPassword(payload);
      await appendAuditLogSafe(request, {
        action: "auth.password_reset_complete",
        resourceName: "auth_users",
        status: "success",
      });
      sendJson(response, 200, resetResponse);
      return;
    }
  } catch (error) {
    sendError(response, getErrorStatusCode(error), error.message);
    return;
  }

  sendError(response, 404, "Auth route not found.");
}

async function handleAdminDashboardRequest(pathname, request, response) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  if (
    !(await requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can access the main admin dashboard."
    ))
  ) {
    return;
  }

  const dashboardMatch = pathname.match(
    /^\/api\/admin\/dashboard(?:\/([a-z-]+))?$/i
  );

  if (!dashboardMatch) {
    sendError(response, 404, "Admin dashboard route not found.");
    return;
  }

  const [, section] = dashboardMatch;
  const payload = await getAdminDashboardSection(section || null);

  if (section && payload == null) {
    sendError(response, 404, "Admin dashboard section not found.");
    return;
  }

  sendJson(response, 200, payload);
}

async function handleAdminAnalyticsRequest(request, response) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  if (
    !(await requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can access admin analytics."
    ))
  ) {
    return;
  }

  const payload = await getAdminAnalyticsPayload();
  sendJson(response, 200, payload);
}

async function handleAdminUsersRequest(pathname, request, response) {
  if (pathname === "/api/admin/users" || pathname === "/api/admin/users/") {
    if (request.method !== "GET") {
      sendError(response, 405, "Method not allowed for this route.");
      return;
    }

    const user = await requireSuperAdminAccess(
      request,
      response,
      "Only the super admin can manage user access."
    );

    if (!user) {
      return;
    }

    const items = await listAdminUsers();
    sendJson(response, 200, { items, total: items.length });
    return;
  }

  const match = pathname.match(/^\/api\/admin\/users\/(\d+)\/?$/i);
  if (!match) {
    sendError(response, 404, "Admin users route not found.");
    return;
  }

  if (!["PATCH", "PUT"].includes(request.method)) {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requireSuperAdminAccess(
    request,
    response,
    "Only the super admin can manage user access."
  );

  if (!user) {
    return;
  }

  const targetId = Number(match[1]);

  try {
    const payload = await parseBody(request);
    const updatedUser = await updateAdminUserAccess(user, targetId, payload);

    await appendAuditLogSafe(request, {
      user,
      action: "admin.users.update",
      resourceName: "auth_users",
      resourceId: updatedUser?.id ?? targetId,
      status: "success",
      detail: {
        role: updatedUser?.role,
        status: updatedUser?.status,
        franchiseId: updatedUser?.franchiseId ?? null,
      },
    });

    sendJson(response, 200, { item: updatedUser });
  } catch (error) {
    sendError(response, error.statusCode || 500, error.message || "Unable to update user access.");
  }
}

async function handleAdminShellRequest(pathname, request, response) {
  if (pathname === "/api/admin/shell/profile") {
    if (request.method !== "PATCH") {
      sendError(response, 405, "Method not allowed for this route.");
      return;
    }

    const user = await requirePrivilegedAccess(request, response);

    if (!user) {
      return;
    }

    try {
      const payload = await parseBody(request);
      const updatedUser = await updateUserAvatar(user.id, payload?.avatar || "");

      await appendAuditLogSafe(request, {
        user: updatedUser,
        action: "admin.profile.update",
        resourceName: "auth_users",
        resourceId: updatedUser?.id ?? user.id,
        status: "success",
      });

      sendJson(response, 200, {
        user: updatedUser,
      });
    } catch (error) {
      sendError(
        response,
        getErrorStatusCode(error),
        error.message || "Unable to update the admin profile."
      );
    }
    return;
  }

  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requirePrivilegedAccess(request, response);

  if (!user) {
    return;
  }

  const payload = await getAdminShellPayload(user);
  sendJson(response, 200, payload);
}

async function handleAuditLogsRequest(request, response, url) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requireSuperAdminAccess(
    request,
    response,
    "Only the super admin can review audit logs."
  );

  if (!user) {
    return;
  }

  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isInteger(requestedLimit) ? requestedLimit : 100;
  const logs = await listAuditLogs({ limit });

  sendJson(response, 200, {
    total: logs.length,
    items: logs,
  });
}

async function handleMetricsRequest(request, response) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  if (!isMonitoringAuthorized(request)) {
    sendError(response, 401, "Monitoring token is missing or invalid.");
    return;
  }

  const databaseHealth = await getDatabaseHealth();
  sendJson(response, 200, {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: databaseHealth,
    metrics: getMetricsSnapshot(),
  });
}

async function handleFranchiseDashboardRequest(pathname, request, response, url) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requireFranchiseDashboardAccess(request, response);

  if (!user) {
    return;
  }

  const dashboardMatch = pathname.match(
    /^\/api\/franchise\/(summary|next-match|notices|squad-summary|budget-trend)$/i
  );

  if (!dashboardMatch) {
    sendError(response, 404, "Franchise dashboard route not found.");
    return;
  }

  const [, section] = dashboardMatch;
  const payload = await getFranchiseDashboardSection(section, {
    user,
    searchParams: url.searchParams,
  });

  if (payload == null) {
    sendError(response, 404, "Franchise dashboard section not found.");
    return;
  }

  sendJson(response, 200, payload);
}

const ADMIN_SEARCH_RESOURCES = [
  {
    resourceName: "players",
    label: "Players",
    path: "/admin/players",
    buildSubtitle: (record) =>
      [record.team_name, record.role].filter(Boolean).join(" • "),
    buildTitle: (record) => record.full_name,
    buildMeta: (record) => record.status || "Player",
  },
  {
    resourceName: "performances",
    label: "Performances",
    path: "/admin/analytics",
    buildSubtitle: (record) =>
      [
        record.team_name,
        record.matches != null ? `${record.matches} matches` : "",
        record.runs != null ? `${record.runs} runs` : "",
        record.wickets != null ? `${record.wickets} wickets` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    buildTitle: (record) => record.player_name,
    buildMeta: (record) => "Performance",
  },
  {
    resourceName: "teams",
    label: "Teams",
    path: "/admin/teams",
    buildSubtitle: (record) =>
      [record.city, record.coach || record.owner].filter(Boolean).join(" • "),
    buildTitle: (record) => record.team_name,
    buildMeta: (record) => record.status || "Team",
  },
  {
    resourceName: "franchises",
    label: "Franchises",
    path: "/admin/franchises",
    buildSubtitle: (record) =>
      [record.owner_name, record.website].filter(Boolean).join(" • "),
    buildTitle: (record) => record.company_name,
    buildMeta: () => "Franchise",
  },
  {
    resourceName: "matches",
    label: "Matches",
    path: "/admin/matches",
    buildSubtitle: (record) =>
      [record.date, record.venue].filter(Boolean).join(" • "),
    buildTitle: (record) => `${record.teamA} vs ${record.teamB}`,
    buildMeta: (record) => record.status || "Match",
  },
  {
    resourceName: "venues",
    label: "Venues",
    path: "/admin/matches",
    buildSubtitle: (record) =>
      [record.city, record.location, record.contact_person]
        .filter(Boolean)
        .join(" • "),
    buildTitle: (record) => record.ground_name,
    buildMeta: () => "Venue",
  },
  {
    resourceName: "approvals",
    label: "Approvals",
    path: "/admin/approvals",
    buildSubtitle: (record) =>
      [record.requested_by, record.priority, record.status]
        .filter(Boolean)
        .join(" • "),
    buildTitle: (record) => record.subject,
    buildMeta: (record) => record.request_type || "Approval",
  },
  {
    resourceName: "invoices",
    label: "Invoices",
    path: "/admin/finance",
    buildSubtitle: (record) =>
      [record.party, record.category, record.status].filter(Boolean).join(" • "),
    buildTitle: (record) => record.invoice_code,
    buildMeta: (record) => record.flow || "Invoice",
  },
  {
    resourceName: "auctions",
    label: "Auctions",
    path: "/admin/auction",
    buildSubtitle: (record) =>
      [
        record.team_name || "Open lot",
        record.status,
        Number(record.sold_price || 0) > 0 ? `Rs ${record.sold_price}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    buildTitle: (record) => record.player_name,
    buildMeta: (record) => record.player_role || "Auction",
  },
];

function filterSearchRecords(resourceName, records, query, limit) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const searchFields = RESOURCE_CONFIG[resourceName]?.searchFields || [];

  return records
    .map((record) => {
      const haystacks = searchFields.map((field) =>
        String(record[field] || "").toLowerCase()
      );

      let score = 0;

      for (const haystack of haystacks) {
        if (!haystack) {
          continue;
        }

        if (haystack === normalizedQuery) {
          score = Math.max(score, 120);
        } else if (haystack.startsWith(normalizedQuery)) {
          score = Math.max(score, 90);
        } else if (haystack.includes(normalizedQuery)) {
          score = Math.max(score, 60);
        }
      }

      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return Number(left.record.id || 0) - Number(right.record.id || 0);
    })
    .slice(0, limit)
    .map((item) => item.record);
}

async function handleAdminSearchRequest(request, response, url) {
  if (request.method !== "GET") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requirePrivilegedAccess(request, response);

  if (!user) {
    return;
  }

  if (user.role === "franchise_admin") {
    const payload = await getFranchiseSearchPayload({
      user,
      searchParams: url.searchParams,
    });
    sendJson(response, 200, payload);
    return;
  }

  const query = String(
    url.searchParams.get("q") || url.searchParams.get("search") || ""
  ).trim();
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "", 10);
  const groupLimit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 10;

  if (query.length < 2) {
    sendJson(response, 200, {
      query,
      total: 0,
      groups: [],
    });
    return;
  }

  const allowedResourceNamesByRole = {
    super_admin: ADMIN_SEARCH_RESOURCES.map((config) => config.resourceName),
    ops_manager: ["matches", "venues"],
    scorer: [],
    finance_admin: ["invoices"],
  };
  const allowedResourceNames =
    allowedResourceNamesByRole[user.role] || [];
  const searchableResources = ADMIN_SEARCH_RESOURCES.filter((config) =>
    allowedResourceNames.includes(config.resourceName)
  );

  const groups = (
    await Promise.all(
      searchableResources.map(async (config) => {
        const records = await listCollection(config.resourceName);
        const matchedRecords = filterSearchRecords(
          config.resourceName,
          records,
          query,
          groupLimit
        );

        if (matchedRecords.length === 0) {
          return null;
        }

        return {
          key: config.resourceName,
          label: config.label,
          items: matchedRecords.map((record) => ({
            id: record.id,
            title: config.buildTitle(record),
            subtitle: config.buildSubtitle(record),
            meta: config.buildMeta(record),
            path: config.path,
          })),
        };
      })
    )
  ).filter(Boolean);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  sendJson(response, 200, {
    query,
    total,
    groups,
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function buildProjectDataResponse(resourceName, data) {
  if (!data) {
    return null;
  }

  if (resourceName !== "home") {
    return data;
  }

  const [teams, topPerformers] = await Promise.all([
    listCollection("teams"),
    getTopPerformers(),
  ]);

  return {
    ...data,
    standings: data?.standings
      ? {
          ...data.standings,
          season: buildHomeStandingsRows(data.standings.season, teams),
        }
      : data?.standings,
    topPerformers,
  };
}

async function handleUploadRequest(pathname, request, response) {
  if (
    pathname !== "/api/uploads/player-photo" &&
    pathname !== "/api/uploads/team-logo" &&
    pathname !== "/api/uploads/franchise-logo" &&
    pathname !== "/api/uploads/sponsor-logo" &&
    pathname !== "/api/uploads/admin-avatar"
  ) {
    sendError(response, 404, "Upload route not found.");
    return;
  }

  if (request.method !== "POST") {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const uploadAccess =
    pathname === "/api/uploads/sponsor-logo"
      ? await requireRoleAccess(
          request,
          response,
          ["super_admin"],
          "Only the super admin can upload sponsor assets."
        )
      : pathname === "/api/uploads/admin-avatar"
      ? await requirePrivilegedAccess(request, response)
      : pathname === "/api/uploads/player-photo" ||
        pathname === "/api/uploads/team-logo" ||
        pathname === "/api/uploads/franchise-logo"
      ? await requireFranchiseScopedAccess(
          request,
          response,
          "Only the super admin or franchise admin can upload these assets."
        )
      : null;

  if (!uploadAccess) {
    return;
  }

  try {
    const payload = await parseBody(request);
    const uploadResult =
      pathname === "/api/uploads/team-logo"
        ? await saveTeamLogoUpload(payload)
      : pathname === "/api/uploads/franchise-logo"
        ? await saveFranchiseLogoUpload(payload)
      : pathname === "/api/uploads/sponsor-logo"
        ? await saveSponsorLogoUpload(payload)
      : pathname === "/api/uploads/admin-avatar"
        ? await saveAdminAvatarUpload(payload)
      : await savePlayerPhotoUpload(payload);

    await appendAuditLogSafe(request, {
      user: uploadAccess,
      action: "upload.asset",
      resourceName: pathname.includes("franchise")
        ? "franchises"
      : pathname.includes("sponsor")
        ? "project_content"
      : pathname.includes("admin-avatar")
        ? "auth_users"
      : pathname.includes("team")
        ? "teams"
        : "players",
      status: "success",
      detail: uploadResult,
    });
    sendJson(response, 201, uploadResult);
  } catch (error) {
    sendError(response, getErrorStatusCode(error), error.message);
  }
}

async function handleProjectDataRequest(resourceName, section, request, response) {
  if (request.method === "GET") {
    const data = await getProjectData(resourceName);

    if (!data) {
      sendError(response, 404, "Project API resource not found.");
      return;
    }

    const finalData = await buildProjectDataResponse(resourceName, data);

    if (!section) {
      sendJson(response, 200, finalData);
      return;
    }

    const config = PROJECT_DATA_CONFIG[resourceName];
    const sectionKey = config.sections?.[section];

    if (!sectionKey) {
      sendError(response, 404, "Project API section not found.");
      return;
    }

    sendJson(response, 200, finalData[sectionKey]);
    return;
  }

  if (!["PUT", "PATCH"].includes(request.method)) {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requireRoleAccess(
    request,
    response,
    ["super_admin"],
    "Only the super admin can update website content."
  );

  if (!user) {
    return;
  }

  const data = (await getProjectData(resourceName)) || {};
  const payload = await parseBody(request);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    sendError(response, 400, "Request body must be a JSON object.");
    return;
  }

  const config = PROJECT_DATA_CONFIG[resourceName];
  const sectionKey = section ? config.sections?.[section] : null;

  if (section && !sectionKey) {
    sendError(response, 404, "Project API section not found.");
    return;
  }

  const nextData = section
    ? {
        ...data,
        [sectionKey]:
          request.method === "PATCH" &&
          isPlainObject(data?.[sectionKey]) &&
          isPlainObject(payload)
            ? { ...data[sectionKey], ...payload }
            : payload,
      }
    : request.method === "PATCH" && isPlainObject(data) && isPlainObject(payload)
      ? { ...data, ...payload }
      : payload;

  const savedState = await setProjectData(resourceName, nextData);
  const finalData = await buildProjectDataResponse(resourceName, savedState);

  await appendAuditLogSafe(request, {
    user,
    action: `${resourceName}.content.${request.method === "PATCH" ? "patch" : "update"}`,
    resourceName: "project_content",
    status: "success",
    detail: {
      section: section || null,
      keys: Object.keys(payload || {}),
    },
  });

  sendJson(response, 200, section ? finalData?.[sectionKey] : finalData);
}

async function handleLiveMatchRequest(request, response) {
  if (request.method === "GET") {
    const data = await getProjectData("live-match");
    sendJson(response, 200, data);
    return;
  }

  if (!["PUT", "PATCH"].includes(request.method)) {
    sendError(response, 405, "Method not allowed for this route.");
    return;
  }

  const user = await requireLiveMatchControlAccess(
    request,
    response,
    "Only the super admin, ops manager, or scorer can update live match data."
  );

  if (!user) {
    return;
  }

  const payload = await parseBody(request);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    sendError(response, 400, "Request body must be a JSON object.");
    return;
  }

  const currentState =
    request.method === "PATCH" ? (await getProjectData("live-match")) || {} : {};
  const savedState = await setProjectData("live-match", {
    ...currentState,
    ...payload,
    updatedAt: Date.now(),
  });

  await appendAuditLogSafe(request, {
    user,
    action: "live-match.update",
    resourceName: "live-match",
    status: "success",
    detail: {
      keys: Object.keys(payload || {}),
    },
  });
  sendJson(response, 200, savedState);
}

async function serveMedia(requestPath, response) {
  const filePath = path.join(MEDIA_DIR, requestPath.replace("/media/", ""));

  if (!filePath.startsWith(MEDIA_DIR) || !existsSync(filePath)) {
    sendError(response, 404, "Media file not found.");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };

  const fileContent = await readFile(filePath);
  response.writeHead(200, buildResponseHeaders(response, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": "public, max-age=604800, immutable",
  }));
  response.end(fileContent);
}

async function handleCollectionRequest(resourceName, request, response, url) {
  if (request.method === "GET") {
    const readAccess = await requireResourceReadAccess(
      resourceName,
      request,
      response
    );

    if (!readAccess) {
      return;
    }

    const records = await listCollection(resourceName);
    const filteredRecords = applyListFilters(
      resourceName,
      records,
      url.searchParams
    );
    sendJson(response, 200, filteredRecords);
    return;
  }

  if (request.method === "POST") {
    const payload = await parseBody(request);
    const { error, value } = sanitizePayload(resourceName, payload);

    if (error) {
      sendError(response, 400, error);
      return;
    }

    const nextRecord = { ...value };
    RESOURCE_CONFIG[resourceName].onCreate?.(nextRecord);

    const relationshipError = await validateResourceRelationships(
      resourceName,
      nextRecord
    );

    if (relationshipError) {
      sendError(response, 400, relationshipError);
      return;
    }

    const writeAccess = await requireCollectionWriteAccess(
      resourceName,
      request,
      response,
      nextRecord
    );

    if (!writeAccess) {
      return;
    }

    if (resourceName === "players" && writeAccess.role === "franchise_admin") {
      nextRecord.status = "Pending";
    }

    const savedRecord = await createItem(resourceName, nextRecord);

    if (resourceName === "players" && writeAccess.role === "franchise_admin") {
      try {
        await createPlayerRegistrationApproval(savedRecord, writeAccess);
      } catch (error) {
        console.error("Failed to create player approval:", error);
        await deleteItem(resourceName, savedRecord.id).catch((deleteError) => {
          console.error("Failed to roll back player after approval error:", deleteError);
        });
        sendError(
          response,
          500,
          "Player could not be submitted for approval. Please try again."
        );
        return;
      }
    }

    await appendAuditLogSafe(request, {
      user: writeAccess,
      action: `${resourceName}.create`,
      resourceName,
      resourceId: savedRecord.id,
      status: "success",
      detail: savedRecord,
    });
    sendJson(response, 201, savedRecord);
    return;
  }

  sendError(response, 405, "Method not allowed for this collection route.");
}

async function handleItemRequest(resourceName, identifier, request, response) {
  const id = parseIdentifier(identifier);

  if (!id) {
    sendError(response, 400, "Resource id must be a positive integer.");
    return;
  }

  const existingRecord = await getItem(resourceName, id);

  if (!existingRecord) {
    sendError(response, 404, `${resourceName.slice(0, -1)} not found.`);
    return;
  }

  if (request.method === "GET") {
    const readAccess = await requireResourceReadAccess(
      resourceName,
      request,
      response
    );

    if (!readAccess) {
      return;
    }

    sendJson(response, 200, existingRecord);
    return;
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    const payload = await parseBody(request);
    const { error, value } = sanitizePayload(resourceName, payload, {
      partial: request.method === "PATCH",
    });

    if (error) {
      sendError(response, 400, error);
      return;
    }

    const updatedRecord =
      request.method === "PUT"
        ? { id, ...value }
        : { ...existingRecord, ...value, id };

    RESOURCE_CONFIG[resourceName].onCreate?.(updatedRecord);

    const relationshipError = await validateResourceRelationships(
      resourceName,
      updatedRecord
    );

    if (relationshipError) {
      sendError(response, 400, relationshipError);
      return;
    }

    const writeAccess = await requireItemWriteAccess(
      resourceName,
      request,
      response,
      existingRecord,
      updatedRecord,
      request.method
    );

    if (!writeAccess) {
      return;
    }

    const savedRecord = await replaceItem(resourceName, id, updatedRecord);

    if (resourceName === "approvals") {
      await syncApprovalSideEffects(savedRecord);
    }

    await appendAuditLogSafe(request, {
      user: writeAccess,
      action: `${resourceName}.${request.method === "PATCH" ? "patch" : "update"}`,
      resourceName,
      resourceId: savedRecord.id,
      status: "success",
      detail: {
        before: existingRecord,
        after: savedRecord,
      },
    });
    sendJson(response, 200, savedRecord);
    return;
  }

  if (request.method === "DELETE") {
    const writeAccess = await requireItemWriteAccess(
      resourceName,
      request,
      response,
      existingRecord,
      existingRecord,
      request.method
    );

    if (!writeAccess) {
      return;
    }

    await deleteItem(resourceName, id);
    await appendAuditLogSafe(request, {
      user: writeAccess,
      action: `${resourceName}.delete`,
      resourceName,
      resourceId: id,
      status: "success",
      detail: existingRecord,
    });
    sendEmpty(response);
    return;
  }

  sendError(response, 405, "Method not allowed for this item route.");
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const pathname = normalizePathname(url.pathname);

  if (request.method === "OPTIONS") {
    sendEmpty(response);
    return;
  }

  const rateLimit = consumeRateLimit(request, pathname);

  if (rateLimit) {
    sendError(response, 429, rateLimit.message, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
    return;
  }

  if (pathname === "/") {
    if (await tryServeFrontend(pathname, request, response)) {
      return;
    }

    sendJson(response, 200, {
      message: "SPL API server is running.",
      api: "/api/",
      health: "/api/health/",
    });
    return;
  }

  if (pathname === "/api") {
    sendJson(response, 200, buildApiIndex());
    return;
  }

  if (pathname === "/api/health") {
    const databaseHealth = await getDatabaseHealth();
    sendJson(response, 200, {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      uptimeSeconds: Number(((Date.now() - SERVER_START_TIME) / 1000).toFixed(2)),
      ...databaseHealth,
    });
    return;
  }

  if (pathname === "/api/metrics") {
    await handleMetricsRequest(request, response);
    return;
  }

  if (
    pathname === "/api/uploads/player-photo" ||
    pathname === "/api/uploads/team-logo" ||
    pathname === "/api/uploads/franchise-logo" ||
    pathname === "/api/uploads/sponsor-logo" ||
    pathname === "/api/uploads/admin-avatar"
  ) {
    await handleUploadRequest(pathname, request, response);
    return;
  }

  if (pathname === "/api/admin/dashboard" || pathname.startsWith("/api/admin/dashboard/")) {
    await handleAdminDashboardRequest(pathname, request, response);
    return;
  }

  if (pathname === "/api/admin/analytics") {
    await handleAdminAnalyticsRequest(request, response);
    return;
  }

  if (pathname === "/api/admin/users" || pathname.startsWith("/api/admin/users/")) {
    await handleAdminUsersRequest(pathname, request, response);
    return;
  }

  if (pathname === "/api/admin/shell" || pathname === "/api/admin/shell/profile") {
    await handleAdminShellRequest(pathname, request, response);
    return;
  }

  if (pathname === "/api/admin/audit-logs") {
    await handleAuditLogsRequest(request, response, url);
    return;
  }

  if (pathname === "/api/admin/search") {
    await handleAdminSearchRequest(request, response, url);
    return;
  }

  if (pathname.startsWith("/api/franchise/")) {
    await handleFranchiseDashboardRequest(pathname, request, response, url);
    return;
  }

  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    await handleAuthRequest(pathname, request, response);
    return;
  }

  if (pathname === "/api/home" || pathname.startsWith("/api/home/")) {
    const homeMatch = pathname.match(/^\/api\/home(?:\/([a-z-]+))?$/i);

    if (!homeMatch) {
      sendError(response, 404, "Home API route not found.");
      return;
    }

    const [, section] = homeMatch;
    await handleProjectDataRequest("home", section, request, response);
    return;
  }

  if (pathname === "/api/live-match") {
    await handleLiveMatchRequest(request, response);
    return;
  }

  if (pathname.startsWith("/media/")) {
    await serveMedia(pathname, response);
    return;
  }

  if (await tryServeFrontend(pathname, request, response)) {
    return;
  }

  const routeMatch = pathname.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/i);

  if (!routeMatch) {
    sendError(response, 404, "Route not found.");
    return;
  }

  const [, resourceName, identifier] = routeMatch;

  if (!RESOURCE_CONFIG[resourceName]) {
    sendError(response, 404, "API resource not found.");
    return;
  }

  if (identifier) {
    await handleItemRequest(resourceName, identifier, request, response);
    return;
  }

  await handleCollectionRequest(resourceName, request, response, url);
}

function createServer() {
  return http.createServer((request, response) => {
    response.__request = request;
    const startedAt = Date.now();
    const normalizedPath = normalizePathname(
      new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname
    );

    requestMetrics.totalRequests += 1;
    requestMetrics.methodCounts[request.method] =
      (requestMetrics.methodCounts[request.method] || 0) + 1;
    requestMetrics.routeCounts[normalizedPath] =
      (requestMetrics.routeCounts[normalizedPath] || 0) + 1;

    response.once("finish", () => {
      requestMetrics.statusCounts[response.statusCode] =
        (requestMetrics.statusCounts[response.statusCode] || 0) + 1;
      requestMetrics.totalResponseTimeMs += Date.now() - startedAt;

      if (response.statusCode >= 500) {
        requestMetrics.totalErrors += 1;
      }
    });

    handleRequest(request, response).catch((error) => {
      console.error("SPL API error:", error);

      if (!response.headersSent) {
        sendError(response, 500, "Internal server error.");
      } else {
        response.end();
      }
    });
  });
}

function assertRuntimeConfig() {
  const validation = validateServerEnv();

  for (const warning of validation.warnings) {
    console.warn(`[config] ${warning}`);
  }

  if (validation.errors.length > 0) {
    throw new Error(
      `Invalid backend configuration:\n- ${validation.errors.join("\n- ")}`
    );
  }
}

function startServer(port = PORT, host = HOST) {
  assertRuntimeConfig();

  return initializeDatabase().then(
    () =>
      new Promise((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(port, host, () => resolve(server));
      })
  );
}

if (require.main === module) {
  startServer()
    .then((server) => {
      const address = server.address();
      const resolvedPort =
        typeof address === "object" && address ? address.port : PORT;
      console.log(`SPL API listening on http://localhost:${resolvedPort}`);
    })
    .catch((error) => {
      console.error("Unable to start SPL API:", error);
      process.exitCode = 1;
    });
}

module.exports = {
  createServer,
  startServer,
};
