process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SPL_AUTH_SECRET =
  process.env.SPL_AUTH_SECRET || "spl-integration-test-secret";

const test = require("node:test");
const assert = require("node:assert/strict");
const sql = require("mssql");

const { createSessionToken, getAuthUserByEmail } = require("../authService");
const { closeDatabase, initializeDatabase } = require("../db");
const { startServer } = require("../server");

let server;
let baseUrl = "";
let adminToken = "";
let opsToken = "";
let franchiseToken = "";
let scorerToken = "";
let financeToken = "";
let fanToken = "";

const createdMatchIds = new Set();
const createdPlayerIds = new Set();
const createdUserEmails = new Set();

async function request(pathname, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const rawText = await response.text();
  let json = null;

  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch (error) {
      json = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    json,
    text: rawText,
  };
}

async function cleanupCreatedData() {
  const pool = await initializeDatabase();

  for (const matchId of createdMatchIds) {
    await pool.request().input("id", sql.Int, Number(matchId)).query(`
DELETE FROM dbo.matches
WHERE id = @id;
`);
  }

  for (const playerId of createdPlayerIds) {
    await pool.request().input("id", sql.Int, Number(playerId)).query(`
DELETE FROM dbo.players
WHERE id = @id;
`);
  }

  for (const email of createdUserEmails) {
    await pool.request().input("email", sql.NVarChar(255), email).query(`
DELETE FROM dbo.auth_users
WHERE email = @email;
`);
  }

  createdMatchIds.clear();
  createdPlayerIds.clear();
  createdUserEmails.clear();
}

test.before(async () => {
  server = await startServer(0, "127.0.0.1");
  const address = server.address();
  const port =
    typeof address === "object" && address ? Number(address.port) : 4000;

  baseUrl = `http://127.0.0.1:${port}`;

  const [adminUser, opsUser, franchiseUser, scorerUser, financeUser, fanUser] =
    await Promise.all([
    getAuthUserByEmail("admin@spl.local"),
    getAuthUserByEmail("ops@spl.local"),
    getAuthUserByEmail("franchise@spl.local"),
    getAuthUserByEmail("scorer@spl.local"),
    getAuthUserByEmail("finance@spl.local"),
    getAuthUserByEmail("fan@spl.local"),
    ]);

  assert.ok(adminUser, "seeded admin user should exist");
  assert.ok(opsUser, "seeded ops manager should exist");
  assert.ok(franchiseUser, "seeded franchise admin should exist");
  assert.ok(scorerUser, "seeded scorer should exist");
  assert.ok(financeUser, "seeded finance admin should exist");
  assert.ok(fanUser, "seeded fan user should exist");

  adminToken = createSessionToken(adminUser);
  opsToken = createSessionToken(opsUser);
  franchiseToken = createSessionToken(franchiseUser);
  scorerToken = createSessionToken(scorerUser);
  financeToken = createSessionToken(financeUser);
  fanToken = createSessionToken(fanUser);
});

test.after(async () => {
  await cleanupCreatedData();

  if (server) {
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

  await closeDatabase();
});

test(
  "auth register, login, and me flow works for a public fan account",
  { concurrency: false },
  async () => {
    const uniqueSuffix = Date.now();
    const email = `integrationfan${uniqueSuffix}@gmail.com`;
    const employeeId = `SPL-IT-FAN-${uniqueSuffix}`;
    const password = "Integration@123";

    const registerResponse = await request("/api/auth/register/", {
      method: "POST",
      body: {
        fullName: "Integration Fan",
        email,
        employeeId,
        password,
        role: "fan_user",
      },
    });

    assert.equal(registerResponse.status, 201);
    assert.ok(registerResponse.json?.token, "register should return a token");
    assert.equal(registerResponse.json?.user?.email, email);
    createdUserEmails.add(email);

    const loginResponse = await request("/api/auth/login/", {
      method: "POST",
      body: {
        email,
        password,
        role: "fan_user",
      },
    });

    assert.equal(loginResponse.status, 200);
    assert.ok(loginResponse.json?.token, "login should return a token");
    assert.equal(loginResponse.json?.user?.role, "fan_user");

    const meResponse = await request("/api/auth/me/", {
      token: loginResponse.json.token,
    });

    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.json?.user?.email, email);
    assert.equal(meResponse.json?.user?.role, "fan_user");
  }
);

test(
  "public registration rejects fake or non-gmail email addresses",
  { concurrency: false },
  async () => {
    const uniqueSuffix = Date.now();
    const response = await request("/api/auth/register/", {
      method: "POST",
      body: {
        fullName: "Invalid Email Fan",
        email: `integration.fan.${uniqueSuffix}@spl.local`,
        employeeId: `SPL-IT-INVALID-${uniqueSuffix}`,
        password: "Integration@123",
        role: "fan_user",
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.json?.detail, "Add valid Gmail account.");
  }
);

test(
  "franchise registration also rejects fake or non-gmail email addresses",
  { concurrency: false },
  async () => {
    const uniqueSuffix = Date.now();
    const response = await request("/api/auth/register/", {
      method: "POST",
      body: {
        fullName: "Invalid Franchise Email",
        email: `integration.franchise.${uniqueSuffix}@spl.local`,
        employeeId: `SPL-IT-FR-INVALID-${uniqueSuffix}`,
        password: "Integration@123",
        role: "franchise_admin",
        franchiseName: `Integration Franchise ${uniqueSuffix}`,
        website: "https://example.com",
        address: "Hyderabad",
      },
    });

    assert.equal(response.status, 400);
    assert.equal(response.json?.detail, "Add valid Gmail account.");
  }
);

test(
  "public home and live-match endpoints return current branded content",
  { concurrency: false },
  async () => {
    const [homeResponse, liveMatchResponse] = await Promise.all([
      request("/api/home/"),
      request("/api/live-match/"),
    ]);

    assert.equal(homeResponse.status, 200);
    assert.ok(Array.isArray(homeResponse.json?.announcements));
    assert.ok(Array.isArray(homeResponse.json?.latestNews));
    assert.ok(Array.isArray(homeResponse.json?.topPerformers));
    assert.equal(homeResponse.json?.announcements?.[0]?.title, "Wipro vs Infosys");

    const topPerformerTeams = homeResponse.json.topPerformers.map(
      (item) => item.team
    );
    assert.ok(topPerformerTeams.includes("Infosys"));
    assert.ok(topPerformerTeams.includes("Wipro"));
    assert.ok(topPerformerTeams.includes("HCL"));
    assert.doesNotMatch(topPerformerTeams.join(","), /Raynx Rockets/i);
    assert.doesNotMatch(topPerformerTeams.join(","), /Code Crusaders/i);
    assert.doesNotMatch(topPerformerTeams.join(","), /Debug Kings/i);

    assert.equal(liveMatchResponse.status, 200);
    assert.equal(liveMatchResponse.json?.matchTitle, "Wipro vs Infosys");
    assert.equal(liveMatchResponse.json?.battingTeam, "Wipro");
    assert.equal(liveMatchResponse.json?.bowlingTeam, "Infosys");
  }
);

test(
  "admin-only dashboard blocks franchise admins and allows platform admins",
  { concurrency: false },
  async () => {
    const unauthenticatedResponse = await request("/api/admin/dashboard/stats/");
    assert.equal(unauthenticatedResponse.status, 401);

    const franchiseResponse = await request("/api/admin/dashboard/stats/", {
      token: franchiseToken,
    });
    assert.equal(franchiseResponse.status, 403);
    assert.match(
      franchiseResponse.json?.detail || "",
      /super admin/i
    );

    const adminResponse = await request("/api/admin/dashboard/stats/", {
      token: adminToken,
    });
    assert.equal(adminResponse.status, 200);
    assert.ok(Array.isArray(adminResponse.json));
    assert.ok(adminResponse.json.length > 0);
  }
);

test(
  "role-scoped APIs allow only the expected dashboard actions",
  { concurrency: false },
  async () => {
    const uniqueSuffix = Date.now();

    const opsCreateResponse = await request("/api/matches/", {
      method: "POST",
      token: opsToken,
      body: {
        teamA: "Wipro",
        teamB: "Infosys",
        date: "2026-05-01",
        time: "19:00",
        venue: "SPL Main Stadium, Hyderabad",
        status: "Upcoming",
        result: "",
        umpire: `Ops Umpire ${uniqueSuffix}`,
      },
    });

    assert.equal(opsCreateResponse.status, 201);
    assert.ok(opsCreateResponse.json?.id);
    createdMatchIds.add(opsCreateResponse.json.id);

    const opsFinanceResponse = await request("/api/invoices/", {
      token: opsToken,
    });
    assert.equal(opsFinanceResponse.status, 403);

    const scorerLiveUpdateResponse = await request("/api/live-match/", {
      method: "PATCH",
      token: scorerToken,
      body: {
        updatedByRoleTest: true,
      },
    });
    assert.equal(scorerLiveUpdateResponse.status, 200);
    assert.equal(scorerLiveUpdateResponse.json?.updatedByRoleTest, true);

    const scorerMatchCreateResponse = await request("/api/matches/", {
      method: "POST",
      token: scorerToken,
      body: {
        teamA: "Wipro",
        teamB: "Infosys",
        date: "2026-05-02",
        time: "20:00",
        venue: "SPL Main Stadium, Hyderabad",
        status: "Upcoming",
      },
    });
    assert.equal(scorerMatchCreateResponse.status, 403);

    const financeInvoicesResponse = await request("/api/invoices/", {
      token: financeToken,
    });
    assert.equal(financeInvoicesResponse.status, 200);
    assert.ok(Array.isArray(financeInvoicesResponse.json));
    assert.ok(financeInvoicesResponse.json.length > 0);

    const financeApprovalsResponse = await request("/api/approvals/", {
      token: financeToken,
    });
    assert.equal(financeApprovalsResponse.status, 403);
  }
);

test(
  "api responses include security and cors headers",
  { concurrency: false },
  async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(response.headers.get("access-control-allow-origin"));
  }
);

test(
  "monitoring and audit routes expose operational data to the expected callers",
  { concurrency: false },
  async () => {
    const metricsResponse = await request("/api/metrics/");
    assert.equal(metricsResponse.status, 200);
    assert.equal(metricsResponse.json?.status, "ok");
    assert.equal(
      typeof metricsResponse.json?.metrics?.http?.totalRequests,
      "number"
    );
    assert.ok(
      (metricsResponse.json?.metrics?.http?.routeCounts?.["/api/metrics"] || 0) >= 1
    );

    const unauthorizedAuditResponse = await request("/api/admin/audit-logs/", {
      token: financeToken,
    });
    assert.equal(unauthorizedAuditResponse.status, 403);

    const auditResponse = await request("/api/admin/audit-logs/?limit=10", {
      token: adminToken,
    });
    assert.equal(auditResponse.status, 200);
    assert.ok(Array.isArray(auditResponse.json?.items));
  }
);

test(
  "franchise dashboard stays protected and franchise scoped",
  { concurrency: false },
  async () => {
    const fanResponse = await request("/api/franchise/summary/", {
      token: fanToken,
    });
    assert.equal(fanResponse.status, 403);

    const franchiseResponse = await request("/api/franchise/summary/", {
      token: franchiseToken,
    });
    assert.equal(franchiseResponse.status, 200);
    assert.equal(franchiseResponse.json?.context?.franchiseId, 1);
    assert.ok(Array.isArray(franchiseResponse.json?.cards));
    assert.ok(franchiseResponse.json.cards.length > 0);
  }
);

test(
  "team and player filters stay franchise-aware for roster views",
  { concurrency: false },
  async () => {
    const teamsResponse = await request("/api/teams/?franchiseId=1");
    assert.equal(teamsResponse.status, 200);
    assert.ok(Array.isArray(teamsResponse.json));
    assert.ok(teamsResponse.json.length >= 1);
    const wiproTeam =
      teamsResponse.json.find((team) => team?.team_name === "Wipro") ||
      teamsResponse.json[0];
    assert.ok(wiproTeam?.id, "expected a franchise team record");

    const playingXiResponse = await request(
      `/api/players/?teamId=${wiproTeam.id}&squadRole=Playing%20XI`
    );
    const fullRosterResponse = await request(
      `/api/players/?teamId=${wiproTeam.id}`
    );
    assert.equal(playingXiResponse.status, 200);
    assert.equal(fullRosterResponse.status, 200);
    assert.ok(Array.isArray(playingXiResponse.json));
    assert.ok(Array.isArray(fullRosterResponse.json));
    assert.ok(fullRosterResponse.json.length >= playingXiResponse.json.length);
    assert.ok(fullRosterResponse.json.length >= 1);
    assert.ok(
      fullRosterResponse.json.every(
        (player) =>
          Number(player.team_id) === Number(wiproTeam.id) &&
          player.team_name === wiproTeam.team_name
      )
    );
    assert.ok(
      playingXiResponse.json.every(
        (player) =>
          Number(player.team_id) === Number(wiproTeam.id) &&
          player.team_name === wiproTeam.team_name
      )
    );
  }
);

test(
  "admin search returns backend player results for typed queries",
  { concurrency: false },
  async () => {
    const searchResponse = await request("/api/admin/search/?q=abhishek", {
      token: adminToken,
    });

    assert.equal(searchResponse.status, 200);
    assert.ok(Number(searchResponse.json?.total || 0) > 0);
    assert.ok(Array.isArray(searchResponse.json?.groups));

    const playersGroup = searchResponse.json.groups.find(
      (group) => group.key === "players"
    );

    assert.ok(playersGroup, "player search group should be present");
    assert.ok(
      playersGroup.items.some((item) =>
        String(item.title || "").toLowerCase().includes("abhishek")
      ),
      "player results should include Abhishek"
    );
  }
);

test(
  "franchise admin shell stays scoped to the assigned franchise",
  { concurrency: false },
  async () => {
    const shellResponse = await request("/api/admin/shell/", {
      token: franchiseToken,
    });

    assert.equal(shellResponse.status, 200);
    assert.equal(shellResponse.json?.profile?.roleLabel, "Franchise Admin");
    assert.equal(shellResponse.json?.profile?.contextLabel, "Wipro");
    assert.equal(shellResponse.json?.badges?.["/franchise"], "1");
    assert.equal(shellResponse.json?.badges?.["/admin/players"], undefined);

    const notificationsSnapshot = JSON.stringify(
      shellResponse.json?.notifications || []
    );

    assert.doesNotMatch(notificationsSnapshot, /Zoho/i);
    assert.doesNotMatch(notificationsSnapshot, /HCL/i);
    assert.doesNotMatch(notificationsSnapshot, /Mahindra/i);
  }
);

test(
  "franchise admin search stays scoped to franchise-owned records",
  { concurrency: false },
  async () => {
    const searchResponse = await request("/api/admin/search/?q=abhishek", {
      token: franchiseToken,
    });

    assert.equal(searchResponse.status, 200);
    assert.equal(searchResponse.json?.context?.teamName, "Wipro");
    assert.ok(Array.isArray(searchResponse.json?.groups));

    const serializedGroups = JSON.stringify(searchResponse.json.groups);
    assert.match(serializedGroups, /Abhishek/);
    assert.doesNotMatch(serializedGroups, /Viswanadh/);
    assert.doesNotMatch(serializedGroups, /Infosys/);
  }
);

test(
  "players CRUD enforces validation and normalizes team data",
  { concurrency: false },
  async () => {
    const teamsResponse = await request("/api/teams/?limit=1");
    assert.equal(teamsResponse.status, 200);
    assert.ok(Array.isArray(teamsResponse.json));
    assert.ok(teamsResponse.json.length > 0, "at least one seeded team should exist");

    const team = teamsResponse.json[0];
    const uniqueSuffix = Date.now();

    const invalidResponse = await request("/api/players/", {
      method: "POST",
      token: adminToken,
      body: {
        full_name: "Invalid Integration Player",
        team_id: team.id,
        email: "not-an-email",
        mobile: "9876543210",
        squad_role: "Reserve",
      },
    });

    assert.equal(invalidResponse.status, 400);
    assert.match(invalidResponse.json?.detail || "", /valid email/i);

    const createResponse = await request("/api/players/", {
      method: "POST",
      token: adminToken,
      body: {
        full_name: `Integration Player ${uniqueSuffix}`,
        role: "Batsman",
        squad_role: "Reserve",
        team_id: team.id,
        batting_style: "Right-hand Bat",
        bowling_style: "Right-arm Medium",
        date_of_birth: "2000-01-01",
        mobile: "9876543210",
        email: `integration.player.${uniqueSuffix}@spl.local`,
        salary: 150000,
      },
    });

    assert.equal(createResponse.status, 201);
    assert.ok(createResponse.json?.id, "created player should have an id");
    assert.equal(createResponse.json?.team_name, team.team_name);
    createdPlayerIds.add(createResponse.json.id);

    const getResponse = await request(`/api/players/${createResponse.json.id}/`);
    assert.equal(getResponse.status, 200);
    assert.equal(getResponse.json?.team_id, team.id);
    assert.equal(getResponse.json?.team_name, team.team_name);
    assert.equal(getResponse.json?.email, `integration.player.${uniqueSuffix}@spl.local`);

    const deleteResponse = await request(`/api/players/${createResponse.json.id}/`, {
      method: "DELETE",
      token: adminToken,
    });

    assert.equal(deleteResponse.status, 204);
    createdPlayerIds.delete(createResponse.json.id);
  }
);
