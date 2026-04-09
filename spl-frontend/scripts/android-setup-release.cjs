const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(projectRoot, "android");
const keystoreDir = path.join(androidRoot, "keystore");
const keystorePath = path.join(keystoreDir, "spl-league-release.jks");
const propertiesPath = path.join(androidRoot, "keystore.properties");
const isWindows = process.platform === "win32";

function findExistingDirectory(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return "";
}

function resolveJavaHome() {
  return findExistingDirectory([
    process.env.JAVA_HOME,
    "C:\\Program Files\\Microsoft\\jdk-21.0.10.7-hotspot",
    "C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot",
    "C:\\Program Files\\Android\\Android Studio\\jbr",
  ]);
}

function randomSecret() {
  return crypto.randomBytes(18).toString("base64url");
}

function writePropertiesFile({ alias, storePassword, keyPassword }) {
  const content = [
    "storeFile=keystore/spl-league-release.jks",
    `storePassword=${storePassword}`,
    `keyAlias=${alias}`,
    `keyPassword=${keyPassword}`,
    "",
  ].join("\n");

  fs.writeFileSync(propertiesPath, content, "utf8");
}

function main() {
  const javaHome = resolveJavaHome();

  if (!javaHome) {
    throw new Error(
      "JAVA_HOME could not be resolved. Install a JDK or set JAVA_HOME first."
    );
  }

  if (!fs.existsSync(androidRoot)) {
    throw new Error(
      "Android project not found. Run `npm run cap:add:android` first."
    );
  }

  fs.mkdirSync(keystoreDir, { recursive: true });

  if (fs.existsSync(keystorePath) && fs.existsSync(propertiesPath)) {
    process.stdout.write(
      "[android-setup-release] Release keystore already exists. Reusing it.\n"
    );
    return;
  }

  if (fs.existsSync(keystorePath) || fs.existsSync(propertiesPath)) {
    throw new Error(
      "A partial release signing setup exists. Remove the existing keystore or keystore.properties and rerun."
    );
  }

  const alias = "splleague";
  const storePassword = randomSecret();
  const keyPassword = storePassword;
  const keytoolPath = path.join(javaHome, "bin", isWindows ? "keytool.exe" : "keytool");
  const args = [
    "-genkeypair",
    "-v",
    "-storetype",
    "PKCS12",
    "-keystore",
    keystorePath,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    "CN=SPL League, OU=Mobile, O=SPL, L=Hyderabad, ST=Telangana, C=IN",
  ];

  const result = spawnSync(keytoolPath, args, {
    stdio: "inherit",
    cwd: projectRoot,
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      PATH: [
        path.join(javaHome, "bin"),
        process.env.PATH || "",
      ].join(path.delimiter),
    },
    shell: false,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }

  writePropertiesFile({ alias, storePassword, keyPassword });
  process.stdout.write(
    `[android-setup-release] Created release signing files in ${keystoreDir}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`[android-setup-release] ${error.message}\n`);
  process.exit(1);
}
