const path = require("path");
const { existsSync, readFileSync } = require("fs");

const DEFAULT_AUTH_SECRET = "spl-local-dev-secret-change-me";

let envLoaded = false;

function loadEnvFile(filePath, { overrideExisting = false } = {}) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContent = readFileSync(filePath, "utf8");

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key || (!overrideExisting && process.env[key] !== undefined)) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadEnvConfig(baseDir = __dirname) {
  if (envLoaded) {
    return;
  }

  const nodeEnv = String(process.env.NODE_ENV || "development").toLowerCase();
  const baseFiles = [".env", ".env.local"];
  const envSpecificFiles = [
    `.env.${nodeEnv}`,
    `.env.${nodeEnv}.local`,
  ];

  for (const fileName of baseFiles) {
    loadEnvFile(path.join(baseDir, fileName));
  }

  for (const fileName of envSpecificFiles) {
    loadEnvFile(path.join(baseDir, fileName), { overrideExisting: true });
  }

  envLoaded = true;
}

function parseBoolean(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseCsv(value = "") {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isPositiveInteger(value) {
  const parsedValue = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsedValue) && parsedValue > 0;
}

function looksLikePlaceholder(value = "") {
  return /^(your_|replace-|changeme|change-me|example)/i.test(
    String(value || "").trim()
  );
}

function validateServerEnv() {
  loadEnvConfig();

  const errors = [];
  const warnings = [];
  const nodeEnv = String(process.env.NODE_ENV || "development").toLowerCase();
  const authSecret = String(process.env.SPL_AUTH_SECRET || "").trim();
  const dbPassword = String(process.env.DB_PASSWORD || "").trim();
  const dbServer = String(process.env.DB_SERVER || process.env.DB_HOST || "").trim();
  const dbUser = String(process.env.DB_USER || "").trim();
  const monitoringToken = String(process.env.SPL_MONITORING_TOKEN || "").trim();
  const allowedOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS || "");

  if (!String(process.env.DB_USER || "").trim()) {
    errors.push("DB_USER is required.");
  }

  if (!dbPassword) {
    errors.push("DB_PASSWORD is required.");
  }

  if (process.env.PORT && !isPositiveInteger(process.env.PORT)) {
    errors.push("PORT must be a positive integer.");
  }

  if (process.env.DB_PORT && !isPositiveInteger(process.env.DB_PORT)) {
    errors.push("DB_PORT must be a positive integer.");
  }

  if (!String(process.env.HOST || "0.0.0.0").trim()) {
    errors.push("HOST cannot be empty.");
  }

  if (!authSecret && nodeEnv !== "test") {
    warnings.push(
      "SPL_AUTH_SECRET is not set. The backend will fall back to a development secret."
    );
  } else if (authSecret === DEFAULT_AUTH_SECRET) {
    warnings.push(
      "SPL_AUTH_SECRET is still using the default development secret."
    );
  }

  if (nodeEnv === "production") {
    if (!authSecret) {
      errors.push("SPL_AUTH_SECRET is required in production.");
    }

    if (authSecret === DEFAULT_AUTH_SECRET) {
      errors.push("SPL_AUTH_SECRET must not use the default development value in production.");
    }

    if (authSecret && dbPassword && authSecret === dbPassword) {
      errors.push("SPL_AUTH_SECRET must not match DB_PASSWORD in production.");
    }

    if (allowedOrigins.length === 0) {
      errors.push("CORS_ALLOWED_ORIGINS is required in production.");
    }

    if (!monitoringToken) {
      errors.push("SPL_MONITORING_TOKEN is required in production.");
    }

    if (looksLikePlaceholder(dbServer)) {
      errors.push("DB_SERVER must be replaced with the real production SQL Server host.");
    }

    if (looksLikePlaceholder(dbUser)) {
      errors.push("DB_USER must be replaced with the real production SQL login.");
    }

    if (looksLikePlaceholder(dbPassword)) {
      errors.push("DB_PASSWORD must be replaced with the real production SQL password.");
    }

    if (looksLikePlaceholder(authSecret)) {
      errors.push("SPL_AUTH_SECRET must be replaced with a real production secret.");
    }
  }

  return {
    errors,
    warnings,
    nodeEnv,
  };
}

module.exports = {
  DEFAULT_AUTH_SECRET,
  loadEnvConfig,
  parseCsv,
  parseBoolean,
  validateServerEnv,
};
