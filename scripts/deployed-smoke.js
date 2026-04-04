const publicRoutes = [
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

function normalizeBaseUrl(value, label) {
  const normalized = String(value || "").trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return body;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

async function verifySpaRoute(frontendBaseUrl, routePath) {
  const html = await fetchText(`${frontendBaseUrl}${routePath}`);

  if (!html.includes('<div id="root"></div>')) {
    throw new Error(`${routePath} did not return the SPA shell.`);
  }
}

async function loginAndGetToken(apiBaseUrl, email, password) {
  const payload = await fetchJson(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const token = String(payload?.token || "").trim();

  if (!token) {
    throw new Error(`Login for ${email} did not return a token.`);
  }

  return token;
}

async function verifyProtectedRoute(apiBaseUrl, token, routePath) {
  await fetchJson(`${apiBaseUrl}${routePath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function main() {
  const frontendBaseUrl = normalizeBaseUrl(
    process.env.DEPLOY_FRONTEND_BASE_URL || process.env.FRONTEND_BASE_URL,
    "DEPLOY_FRONTEND_BASE_URL"
  );
  const apiBaseUrl = normalizeBaseUrl(
    process.env.DEPLOY_API_BASE_URL || process.env.API_BASE_URL || `${frontendBaseUrl}/api`,
    "DEPLOY_API_BASE_URL"
  );

  for (const routePath of publicRoutes) {
    await verifySpaRoute(frontendBaseUrl, routePath);
  }

  const health = await fetchJson(`${apiBaseUrl}/health`);

  if (String(health?.status || "").toLowerCase() !== "ok") {
    throw new Error("Deployed API health check did not return status=ok.");
  }

  const adminEmail = String(
    process.env.DEPLOY_ADMIN_EMAIL || "admin@spl.local"
  ).trim();
  const adminPassword = String(
    process.env.DEPLOY_ADMIN_PASSWORD || "Password@123"
  ).trim();
  const franchiseEmail = String(
    process.env.DEPLOY_FRANCHISE_EMAIL || "franchise@spl.local"
  ).trim();
  const franchisePassword = String(
    process.env.DEPLOY_FRANCHISE_PASSWORD || "Password@123"
  ).trim();

  const adminToken = await loginAndGetToken(apiBaseUrl, adminEmail, adminPassword);
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/admin/dashboard");

  const franchiseToken = await loginAndGetToken(
    apiBaseUrl,
    franchiseEmail,
    franchisePassword
  );
  await verifyProtectedRoute(apiBaseUrl, franchiseToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, franchiseToken, "/franchise/summary");

  process.stdout.write(
    [
      `Deployed SPA smoke passed for ${publicRoutes.length} routes.`,
      "Deployed API health passed.",
      "Admin and franchise protected route checks passed.",
    ].join("\n")
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
