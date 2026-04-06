const path = require("path");
const { spawn } = require("child_process");
const { loadEnvConfig, validateServerEnv } = require("../envConfig");

const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "spl-frontend");
const shutdownSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
const autoCloseMs = Number.parseInt(process.env.DEV_AUTOCLOSE_MS || "", 10);
const configuredBackendStartupTimeoutMs = Number.parseInt(
  process.env.DEV_BACKEND_STARTUP_TIMEOUT_MS || "",
  10
);
const backendStartupTimeoutMs =
  Number.isInteger(configuredBackendStartupTimeoutMs) &&
  configuredBackendStartupTimeoutMs > 0
    ? configuredBackendStartupTimeoutMs
    : 240000;

let frontendProcess = null;
let backendProcess = null;
let shuttingDown = false;

function log(prefix, message) {
  process.stdout.write(`[${prefix}] ${message}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnProcess(name, cwd, command) {
  const child = spawn(command, {
    cwd,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: false,
  });

  child.stdout.on("data", (chunk) => {
    log(name, chunk.toString());
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk.toString()}`);
  });

  return child;
}

async function waitForBackend(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!backendProcess || backendProcess.exitCode !== null) {
      throw new Error("Backend process exited before it became healthy.");
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
    }

    await wait(1000);
  }

  throw new Error("Backend health check timed out.");
}

async function tryFetchJson(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function getBackendApiIndex() {
  return tryFetchJson("http://127.0.0.1:4000/api");
}

function backendSupportsAuth(apiIndex) {
  if (!apiIndex || !Array.isArray(apiIndex.resources)) {
    return false;
  }

  return apiIndex.resources.some(
    (resource) =>
      resource.resource === "auth" &&
      Array.isArray(resource.routes) &&
      resource.routes.includes("/api/auth/login/")
  );
}

async function isFrontendReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
}

function terminateChild(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGINT");
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminateChild(frontendProcess);
  terminateChild(backendProcess);

  setTimeout(() => {
    process.exit(code);
  }, 250);
}

async function main() {
  loadEnvConfig(projectRoot);
  const validation = validateServerEnv();

  for (const warning of validation.warnings) {
    process.stdout.write(`[dev] warning: ${warning}\n`);
  }

  if (validation.errors.length > 0) {
    throw new Error(
      `Backend environment is incomplete:\n- ${validation.errors.join("\n- ")}`
    );
  }

  let health = await tryFetchJson("http://127.0.0.1:4000/api/health");

  if (health) {
    const apiIndex = await getBackendApiIndex();

    if (!backendSupportsAuth(apiIndex)) {
      throw new Error(
        "An outdated backend is already running on port 4000. Stop it and run `npm run dev` again."
      );
    }

    process.stdout.write(
      `[dev] backend already running on http://localhost:4000 (${health.database})\n`
    );
  } else {
    backendProcess = spawnProcess("backend", projectRoot, "npm run api");

    backendProcess.on("exit", (code) => {
      if (shuttingDown) {
        return;
      }

      process.stderr.write(
        `[backend] exited with code ${code == null ? "unknown" : code}\n`
      );
      shutdown(code || 1);
    });

    health = await waitForBackend(
      "http://127.0.0.1:4000/api/health",
      backendStartupTimeoutMs
    );
    const apiIndex = await getBackendApiIndex();

    if (!backendSupportsAuth(apiIndex)) {
      throw new Error(
        "Backend started but the expected auth routes are missing."
      );
    }

    process.stdout.write(
      `[dev] backend ready on http://localhost:4000 (${health.database})\n`
    );
  }

  const frontendReady = await isFrontendReachable("http://127.0.0.1:5173");

  if (frontendReady) {
    process.stdout.write(
      "[dev] frontend already running on http://localhost:5173\n"
    );
  } else {
    frontendProcess = spawnProcess("frontend", frontendRoot, "npm run dev:vite");

    frontendProcess.on("exit", (code) => {
      if (shuttingDown) {
        return;
      }

      process.stderr.write(
        `[frontend] exited with code ${code == null ? "unknown" : code}\n`
      );
      shutdown(code || 1);
    });

    process.stdout.write(
      "[dev] frontend starting on http://localhost:5173\n"
    );
  }

  if (Number.isInteger(autoCloseMs) && autoCloseMs > 0) {
    process.stdout.write(
      `[dev] auto close enabled, shutting down in ${autoCloseMs}ms\n`
    );
    setTimeout(() => shutdown(0), autoCloseMs);
  }
}

for (const signal of shutdownSignals) {
  process.on(signal, () => shutdown(0));
}

main().catch((error) => {
  process.stderr.write(`[dev] ${error.message}\n`);
  shutdown(1);
});
