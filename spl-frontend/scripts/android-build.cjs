const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const gradleCommand = isWindows ? "gradlew.bat" : "./gradlew";

function findExistingDirectory(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return "";
}

function resolveJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    "C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot",
    "C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot",
    "C:\\Program Files\\Android\\Android Studio\\jbr",
  ];

  return findExistingDirectory(candidates);
}

function resolveAndroidHome() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    localAppData ? path.join(localAppData, "Android", "Sdk") : "",
  ];

  return findExistingDirectory(candidates);
}

function escapeLocalPropertiesPath(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/:/g, "\\:");
}

function writeLocalProperties(androidHome) {
  const localPropertiesPath = path.join(androidRoot, "local.properties");
  const content = `sdk.dir=${escapeLocalPropertiesPath(androidHome)}\n`;
  fs.writeFileSync(localPropertiesPath, content, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: options.cwd || projectRoot,
    env: options.env || process.env,
    shell: isWindows,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function main() {
  const args = process.argv.slice(2);
  const syncOnly = args.includes("--sync-only");
  const gradleTasks = args.filter((arg) => arg !== "--sync-only");
  const javaHome = resolveJavaHome();
  const androidHome = resolveAndroidHome();

  if (!javaHome) {
    throw new Error(
      "JAVA_HOME could not be resolved. Install a JDK or set JAVA_HOME first."
    );
  }

  if (!androidHome) {
    throw new Error(
      "ANDROID_HOME could not be resolved. Install Android SDK tools or set ANDROID_HOME first."
    );
  }

  if (!fs.existsSync(androidRoot)) {
    throw new Error(
      "Android project not found. Run `npm run cap:add:android` first."
    );
  }

  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: androidHome,
    ANDROID_SDK_ROOT: androidHome,
    // Ship the homepage hero video in Android builds unless a caller
    // explicitly overrides it at the shell level.
    VITE_ENABLE_HERO_VIDEO:
      Object.prototype.hasOwnProperty.call(process.env, "VITE_ENABLE_HERO_VIDEO")
        ? process.env.VITE_ENABLE_HERO_VIDEO
        : "true",
    PATH: [
      path.join(javaHome, "bin"),
      path.join(androidHome, "platform-tools"),
      path.join(androidHome, "cmdline-tools", "latest", "bin"),
      process.env.PATH || "",
    ].join(path.delimiter),
  };

  writeLocalProperties(androidHome);

  run(npmCommand, ["run", "build:android"], { env });
  run(npxCommand, ["cap", "sync", "android"], { env });

  if (syncOnly) {
    return;
  }

  if (gradleTasks.length === 0) {
    throw new Error("No Gradle task provided.");
  }

  run(gradleCommand, gradleTasks, {
    cwd: androidRoot,
    env,
  });
}

try {
  main();
} catch (error) {
  process.stderr.write(`[android-build] ${error.message}\n`);
  process.exit(1);
}
