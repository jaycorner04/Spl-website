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

async function verifyForbiddenRoute(apiBaseUrl, token, routePath) {
  const response = await fetch(`${apiBaseUrl}${routePath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    throw new Error(`${routePath} should be forbidden for this role.`);
  }

  if (![401, 403].includes(response.status)) {
    const body = await response.text();
    throw new Error(`${routePath} returned ${response.status}: ${body}`);
  }
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
    process.env.DEPLOY_ADMIN_PASSWORD || "Spl@12345"
  ).trim();
  const opsEmail = String(
    process.env.DEPLOY_OPS_EMAIL || "ops@spl.local"
  ).trim();
  const opsPassword = String(
    process.env.DEPLOY_OPS_PASSWORD || "Spl@12345"
  ).trim();
  const financeEmail = String(
    process.env.DEPLOY_FINANCE_EMAIL || "finance@spl.local"
  ).trim();
  const financePassword = String(
    process.env.DEPLOY_FINANCE_PASSWORD || "Spl@12345"
  ).trim();
  const scorerEmail = String(
    process.env.DEPLOY_SCORER_EMAIL || "scorer@spl.local"
  ).trim();
  const scorerPassword = String(
    process.env.DEPLOY_SCORER_PASSWORD || "Spl@12345"
  ).trim();
  const franchiseEmail = String(
    process.env.DEPLOY_FRANCHISE_EMAIL || "franchise@spl.local"
  ).trim();
  const franchisePassword = String(
    process.env.DEPLOY_FRANCHISE_PASSWORD || "Spl@12345"
  ).trim();

  const adminToken = await loginAndGetToken(apiBaseUrl, adminEmail, adminPassword);
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/admin/dashboard");
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/approvals");
  await verifyProtectedRoute(apiBaseUrl, adminToken, "/teams");

  const opsToken = await loginAndGetToken(apiBaseUrl, opsEmail, opsPassword);
  await verifyProtectedRoute(apiBaseUrl, opsToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, opsToken, "/matches");
  await verifyProtectedRoute(apiBaseUrl, opsToken, "/live-match");
  await verifyForbiddenRoute(apiBaseUrl, opsToken, "/approvals");

  const financeToken = await loginAndGetToken(
    apiBaseUrl,
    financeEmail,
    financePassword
  );
  await verifyProtectedRoute(apiBaseUrl, financeToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, financeToken, "/invoices");
  await verifyForbiddenRoute(apiBaseUrl, financeToken, "/teams");

  const scorerToken = await loginAndGetToken(apiBaseUrl, scorerEmail, scorerPassword);
  await verifyProtectedRoute(apiBaseUrl, scorerToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, scorerToken, "/live-match");
  await verifyForbiddenRoute(apiBaseUrl, scorerToken, "/invoices");

  const franchiseToken = await loginAndGetToken(
    apiBaseUrl,
    franchiseEmail,
    franchisePassword
  );
  await verifyProtectedRoute(apiBaseUrl, franchiseToken, "/auth/me");
  await verifyProtectedRoute(apiBaseUrl, franchiseToken, "/franchise/summary");
  await verifyForbiddenRoute(apiBaseUrl, franchiseToken, "/approvals");

  process.stdout.write(
    [
      `Deployed SPA smoke passed for ${publicRoutes.length} routes.`,
      "Deployed API health passed.",
      "Role-based protected route checks passed for super admin, ops, finance, scorer, and franchise access.",
    ].join("\n")
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
