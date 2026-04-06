process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SPL_AUTH_SECRET =
  process.env.SPL_AUTH_SECRET || "spl-dashboard-test-secret";

const path = require("path");
const fs = require("fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const { getAdminDashboardSection } = require("../adminDashboardService");
const { getFranchiseDashboardSection } = require("../franchiseDashboardService");

const authUsers = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "server-data", "auth-users.json"),
    "utf8"
  )
);
const seededFranchiseAdmin =
  authUsers.find((user) => user.role === "franchise_admin") || null;

assert.ok(
  seededFranchiseAdmin,
  "Expected a seeded franchise_admin user in server-data/auth-users.json"
);

function buildSeededFranchiseUser() {
  return {
    role: "franchise_admin",
    franchiseId: Number(seededFranchiseAdmin.franchiseId || 0),
    employeeId: seededFranchiseAdmin.employeeId,
  };
}

test("admin dashboard stats returns populated cards", async () => {
  const stats = await getAdminDashboardSection("stats");

  assert.ok(Array.isArray(stats), "stats should be an array");
  assert.ok(stats.length > 0, "stats should not be empty");
  assert.ok(
    stats.every((item) => item.label && item.value != null),
    "each stat card should expose a label and value"
  );
});

test("franchise dashboard summary resolves scoped franchise context", async () => {
  const payload = await getFranchiseDashboardSection("summary", {
    user: buildSeededFranchiseUser(),
    searchParams: new URLSearchParams(),
  });

  assert.ok(payload, "summary payload should exist");
  assert.ok(payload.context, "summary should include franchise context");
  assert.equal(
    payload.context.franchiseId,
    Number(seededFranchiseAdmin.franchiseId || 0),
    "franchise dashboard should stay scoped to the assigned franchise"
  );
  assert.ok(Array.isArray(payload.cards), "summary cards should be present");
  assert.ok(payload.cards.length > 0, "summary cards should not be empty");
});

test("franchise dashboard next match provides a fixture block", async () => {
  const payload = await getFranchiseDashboardSection("next-match", {
    user: buildSeededFranchiseUser(),
    searchParams: new URLSearchParams(),
  });

  assert.ok(payload, "next-match payload should exist");
  assert.ok(payload.match, "next-match payload should include match details");
  assert.ok(payload.match.fixture, "fixture text should be present");
});
