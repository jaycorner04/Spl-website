process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SPL_AUTH_SECRET =
  process.env.SPL_AUTH_SECRET || "spl-role-smoke-secret";

const assert = require("node:assert/strict");
const { startServer } = require("../server");
const { closeDatabase } = require("../db");

const SEEDED_PASSWORD = process.env.SMOKE_PASSWORD || "Spl@12345";

const roles = [
  {
    key: "super_admin",
    email: "admin@spl.local",
    role: "super_admin",
    allowedRequests: [
      { path: "/api/admin/dashboard/" },
      { path: "/api/admin/analytics/" },
      { path: "/api/approvals/" },
      { path: "/api/invoices/" },
      { path: "/api/auctions/" },
      { path: "/api/franchises/" },
      { path: "/api/live-match/" },
      { path: "/api/franchise/summary/" },
    ],
    deniedRequests: [],
    dashboardShellPaths: ["/admin", "/admin/players", "/admin/teams", "/admin/franchises"],
  },
  {
    key: "ops_manager",
    email: "ops@spl.local",
    role: "ops_manager",
    allowedRequests: [
      { path: "/api/admin/shell/" },
      { path: "/api/matches/" },
      { path: "/api/live-match/" },
    ],
    deniedRequests: [
      { path: "/api/admin/dashboard/" },
      { path: "/api/admin/analytics/" },
      { path: "/api/approvals/" },
      { path: "/api/invoices/" },
      { path: "/api/auctions/" },
    ],
    dashboardShellPaths: ["/admin/matches", "/admin/live-match"],
  },
  {
    key: "scorer",
    email: "scorer@spl.local",
    role: "scorer",
    allowedRequests: [
      { path: "/api/admin/shell/" },
      { path: "/api/live-match/" },
      {
        path: "/api/live-match/",
        method: "PATCH",
        body: {
          smokeCheck: "scorer-update",
        },
      },
    ],
    deniedRequests: [
      { path: "/api/admin/dashboard/" },
      {
        path: "/api/matches/",
        method: "POST",
        body: {
          teamA: "Wipro",
          teamB: "Infosys",
          date: "2026-05-12",
          time: "20:00",
          venue: "SPL Main Stadium, Hyderabad",
          status: "Upcoming",
        },
      },
      { path: "/api/invoices/" },
      { path: "/api/approvals/" },
    ],
    dashboardShellPaths: ["/admin/live-match"],
  },
  {
    key: "finance_admin",
    email: "finance@spl.local",
    role: "finance_admin",
    allowedRequests: [
      { path: "/api/admin/shell/" },
      { path: "/api/invoices/" },
    ],
    deniedRequests: [
      { path: "/api/admin/dashboard/" },
      { path: "/api/approvals/" },
      {
        path: "/api/matches/",
        method: "POST",
        body: {
          teamA: "Wipro",
          teamB: "Infosys",
          date: "2026-05-13",
          time: "20:00",
          venue: "SPL Main Stadium, Hyderabad",
          status: "Upcoming",
        },
      },
      { path: "/api/auctions/" },
    ],
    dashboardShellPaths: ["/admin/finance"],
  },
  {
    key: "franchise_admin",
    email: "franchise@spl.local",
    role: "franchise_admin",
    allowedRequests: [
      { path: "/api/admin/shell/" },
      { path: "/api/franchise/summary/" },
      { path: "/api/teams/?franchiseId=1" },
    ],
    deniedRequests: [
      { path: "/api/admin/dashboard/" },
      { path: "/api/approvals/" },
      { path: "/api/invoices/" },
      { path: "/api/auctions/" },
    ],
    dashboardShellPaths: ["/franchise"],
  },
  {
    key: "fan_user",
    email: "fan@spl.local",
    role: "fan_user",
    allowedRequests: [{ path: "/api/home/" }, { path: "/api/live-match/" }],
    deniedRequests: [
      { path: "/api/admin/shell/" },
      { path: "/api/admin/dashboard/" },
      { path: "/api/franchise/summary/" },
    ],
    dashboardShellPaths: [],
  },
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    text,
  };
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    text,
  };
}

async function login(baseUrl, email, role) {
  const response = await fetchJson(`${baseUrl}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password: SEEDED_PASSWORD,
      role,
    }),
  });

  assert.equal(
    response.status,
    200,
    `Login should succeed for ${email} (${role}). Received: ${response.text}`
  );
  assert.ok(response.json?.token, `Token missing for ${email}`);
  return response.json.token;
}

async function requestWithAuth(baseUrl, token, requestConfig) {
  const { path, method = "GET", body } = requestConfig;

  return fetchJson(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function assertAllowed(baseUrl, token, requestConfig) {
  const response = await requestWithAuth(baseUrl, token, requestConfig);

  assert.ok(
    response.ok,
    `Expected ${requestConfig.method || "GET"} ${requestConfig.path} to be allowed but received ${response.status}: ${response.text}`
  );
}

async function assertDenied(baseUrl, token, requestConfig) {
  const response = await requestWithAuth(baseUrl, token, requestConfig);

  assert.ok(
    [401, 403].includes(response.status),
    `Expected ${requestConfig.method || "GET"} ${requestConfig.path} to be denied but received ${response.status}: ${response.text}`
  );
}

async function assertSpaShell(baseUrl, path) {
  const response = await fetchText(`${baseUrl}${path}`);

  assert.equal(response.status, 200, `Expected ${path} to return the SPA shell.`);
  assert.match(
    response.text,
    /<div id="root"><\/div>/i,
    `Expected ${path} to return the SPA root shell.`
  );
}

(async () => {
  const server = await startServer(0, "127.0.0.1");

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? Number(address.port) : 4000;
    const baseUrl = `http://127.0.0.1:${port}`;
    const summary = [];

    for (const roleConfig of roles) {
      const token = await login(baseUrl, roleConfig.email, roleConfig.role);
      const meResponse = await fetchJson(`${baseUrl}/api/auth/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      assert.equal(meResponse.status, 200, `/api/auth/me/ should succeed for ${roleConfig.role}`);
      assert.equal(meResponse.json?.user?.role, roleConfig.role);

      for (const requestConfig of roleConfig.allowedRequests) {
        await assertAllowed(baseUrl, token, requestConfig);
      }

      for (const requestConfig of roleConfig.deniedRequests) {
        await assertDenied(baseUrl, token, requestConfig);
      }

      for (const shellPath of roleConfig.dashboardShellPaths) {
        await assertSpaShell(baseUrl, shellPath);
      }

      summary.push({
        role: roleConfig.role,
        email: roleConfig.email,
        allowedChecks: roleConfig.allowedRequests.length,
        deniedChecks: roleConfig.deniedRequests.length,
        shellChecks: roleConfig.dashboardShellPaths.length,
      });
    }

    console.log(
      JSON.stringify(
        {
          status: "ok",
          baseUrl,
          rolesTested: summary.length,
          summary,
        },
        null,
        2
      )
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
    await closeDatabase();
  }
})().catch((error) => {
  console.error("Dashboard role smoke failed:");
  console.error(error);
  process.exitCode = 1;
});
