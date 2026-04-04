const http = require("http");
const path = require("path");
const { readFileSync, existsSync } = require("fs");

const distDir = path.join(__dirname, "..", "spl-frontend", "dist");
const indexPath = path.join(distDir, "index.html");
const routesToCheck = [
  "/",
  "/teams",
  "/players",
  "/fixtures",
  "/live",
  "/venues",
  "/login",
  "/register",
  "/admin",
  "/franchise",
];

function createStaticServer() {
  const html = readFileSync(indexPath, "utf8");

  return http.createServer((request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(html);
  });
}

async function fetchRoute(baseUrl, routePath) {
  const response = await fetch(`${baseUrl}${routePath}`);
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`${routePath} returned ${response.status}`);
  }

  if (!html.includes('<div id="root"></div>')) {
    throw new Error(`${routePath} did not return the SPA shell.`);
  }
}

async function main() {
  if (!existsSync(indexPath)) {
    throw new Error(
      "Frontend build output is missing. Run `npm run build:frontend` first."
    );
  }

  const server = createStaticServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 4173;
    const baseUrl = `http://127.0.0.1:${port}`;

    for (const routePath of routesToCheck) {
      await fetchRoute(baseUrl, routePath);
    }

    process.stdout.write(
      `Frontend route smoke passed for ${routesToCheck.length} routes.\n`
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
