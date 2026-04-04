const crypto = require("crypto");
const path = require("path");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const { loadEnvConfig } = require("../envConfig");

const projectRoot = path.resolve(__dirname, "..");
const backendEnvPath = path.join(projectRoot, ".env.production.local");
const frontendEnvPath = path.join(
  projectRoot,
  "spl-frontend",
  ".env.production.local"
);

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      accumulator[key] = value;
      return accumulator;
    }, {});
}

function getExistingValue(parsedValues, key, fallback = "") {
  return String(parsedValues[key] || process.env[key] || fallback).trim();
}

function writeEnvFile(filePath, values) {
  const fileContent = `${values.join("\n")}\n`;
  writeFileSync(filePath, fileContent, "utf8");
}

function main() {
  loadEnvConfig(projectRoot);

  const backendExisting = parseEnvFile(backendEnvPath);
  const frontendExisting = parseEnvFile(frontendEnvPath);
  const authSecret =
    getExistingValue(backendExisting, "SPL_AUTH_SECRET") ||
    crypto.randomBytes(48).toString("hex");

  const backendValues = [
    "NODE_ENV=production",
    `PORT=${getExistingValue(backendExisting, "PORT", process.env.PORT || "4000")}`,
    `HOST=${getExistingValue(backendExisting, "HOST", process.env.HOST || "0.0.0.0")}`,
    `DB_SERVER=${getExistingValue(backendExisting, "DB_SERVER", process.env.DB_SERVER || "localhost")}`,
    `DB_PORT=${getExistingValue(backendExisting, "DB_PORT", process.env.DB_PORT || "1433")}`,
    `DB_NAME=${getExistingValue(backendExisting, "DB_NAME", process.env.DB_NAME || "SPLSqlServer")}`,
    `DB_BOOTSTRAP_DATABASE=${getExistingValue(
      backendExisting,
      "DB_BOOTSTRAP_DATABASE",
      process.env.DB_BOOTSTRAP_DATABASE || "master"
    )}`,
    `DB_USER=${getExistingValue(backendExisting, "DB_USER", process.env.DB_USER || "your_sql_login")}`,
    `DB_PASSWORD=${getExistingValue(
      backendExisting,
      "DB_PASSWORD",
      process.env.DB_PASSWORD || "your_sql_password"
    )}`,
    `SPL_AUTH_SECRET=${authSecret}`,
    `CORS_ALLOWED_ORIGINS=${getExistingValue(
      backendExisting,
      "CORS_ALLOWED_ORIGINS",
      "same-origin"
    )}`,
    `RATE_LIMIT_ENABLED=${getExistingValue(backendExisting, "RATE_LIMIT_ENABLED", "true")}`,
    `DB_ENCRYPT=${getExistingValue(backendExisting, "DB_ENCRYPT", process.env.DB_ENCRYPT || "false")}`,
    `DB_TRUST_SERVER_CERTIFICATE=${getExistingValue(
      backendExisting,
      "DB_TRUST_SERVER_CERTIFICATE",
      process.env.DB_TRUST_SERVER_CERTIFICATE || "true"
    )}`,
  ];

  const frontendValues = [
    `VITE_API_BASE_URL=${getExistingValue(
      frontendExisting,
      "VITE_API_BASE_URL",
      "/api"
    )}`,
    `VITE_ENABLE_HERO_VIDEO=${getExistingValue(
      frontendExisting,
      "VITE_ENABLE_HERO_VIDEO",
      "false"
    )}`,
    `VITE_HERO_VIDEO_URL=${getExistingValue(
      frontendExisting,
      "VITE_HERO_VIDEO_URL",
      ""
    )}`,
  ];

  writeEnvFile(backendEnvPath, backendValues);
  writeEnvFile(frontendEnvPath, frontendValues);

  process.stdout.write(
    [
      `Generated ${backendEnvPath}`,
      `Generated ${frontendEnvPath}`,
      "Production env files are ready for local release checks.",
    ].join("\n")
  );
}

main();
