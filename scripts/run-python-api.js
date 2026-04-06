const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

const pythonCandidates = [
  process.env.PYTHON_BACKEND_EXECUTABLE,
  "C:\\Users\\abhis\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
  "python3",
  "python",
  "py",
].filter(Boolean);

function resolvePythonCommand() {
  for (const candidate of pythonCandidates) {
    if (candidate.toLowerCase().endsWith(".exe")) {
      if (fs.existsSync(candidate)) {
        return { command: candidate, args: [] };
      }

      continue;
    }

    if (candidate === "py") {
      return { command: "py", args: ["-3.12"] };
    }

    return { command: candidate, args: [] };
  }

  throw new Error(
    "Python 3.12 executable was not found. Set PYTHON_BACKEND_EXECUTABLE to continue."
  );
}

function main() {
  const { command, args } = resolvePythonCommand();
  const host = process.env.HOST || "0.0.0.0";
  const port = process.env.PORT || "4000";
  const extraArgs = process.argv.slice(2);

  const child = spawn(
    command,
    [
      ...args,
      "-m",
      "uvicorn",
      "python_backend.app:app",
      "--host",
      host,
      "--port",
      port,
      ...extraArgs,
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: false,
      env: {
        ...process.env,
        PYTHONPATH: projectRoot,
      },
    }
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code || 0);
  });
}

main();
