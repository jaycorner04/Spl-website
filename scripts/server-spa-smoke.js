const path = require("path");
const { existsSync } = require("fs");

const { startServer } = require("../server");

const distIndexPath = path.join(__dirname, "..", "spl-frontend", "dist", "index.html");
const routesToCheck = ["/", "/teams", "/players", "/admin", "/franchise"];
const assetsToCheck = ["/favicon.svg", "/icons.svg"];

async function fetchText(url) {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return body;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

async function main() {
  if (!existsSync(distIndexPath)) {
    throw new Error(
      "Frontend build output is missing. Run `npm run build:frontend` first."
    );
  }

  const server = await startServer(0, "127.0.0.1");

  try {
    const address = server.address();
    const port =
      typeof address === "object" && address ? Number(address.port) : 4000;
    const baseUrl = `http://127.0.0.1:${port}`;

    for (const routePath of routesToCheck) {
      const html = await fetchText(`${baseUrl}${routePath}`);

      if (!html.includes('<div id="root"></div>')) {
        throw new Error(`${routePath} did not return the SPA shell from the backend server.`);
      }
    }

    for (const assetPath of assetsToCheck) {
      await fetchText(`${baseUrl}${assetPath}`);
    }

    const health = await fetchJson(`${baseUrl}/api/health`);

    if (String(health?.status || "").toLowerCase() !== "ok") {
      throw new Error("Backend health check did not return status=ok.");
    }

    process.stdout.write(
      [
        `Backend-served SPA smoke passed for ${routesToCheck.length} routes.`,
        `Static asset smoke passed for ${assetsToCheck.length} files.`,
        "API health passed.",
      ].join("\n")
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
