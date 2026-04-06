const crypto = require("crypto");
const sql = require("mssql");
const { initializeDatabase } = require("./db");

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 15;
const PUBLIC_REGISTRATION_ROLES = new Set(["fan_user", "franchise_admin"]);
const ADMIN_ROLES = new Set([
  "super_admin",
  "ops_manager",
  "franchise_admin",
  "scorer",
  "finance_admin",
]);
const PLATFORM_ADMIN_ROLES = new Set([
  "super_admin",
  "ops_manager",
  "scorer",
  "finance_admin",
]);
const FRANCHISE_DASHBOARD_ROLES = new Set(["super_admin", "franchise_admin"]);
const FRANCHISE_APPROVAL_META_PREFIX = "__SPL_FRANCHISE_REG__";

function getAuthSecret() {
  return process.env.SPL_AUTH_SECRET || process.env.DB_PASSWORD || "spl-local-dev-secret-change-me";
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidRegistrationEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);
  return /^[^\s@]+@gmail\.com$/i.test(normalizedEmail);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const iterations = 120000;
  const keyLength = 64;
  const digest = "sha512";
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, iterations, keyLength, digest)
    .toString("hex");

  return {
    salt,
    iterations,
    keyLength,
    digest,
    passwordHash,
  };
}

function validatePasswordStrength(password = "") {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function verifyPassword(password, userRecord) {
  const derivedHash = crypto
    .pbkdf2Sync(
      password,
      userRecord.salt,
      userRecord.iterations || 120000,
      userRecord.keyLength || 64,
      userRecord.digest || "sha512"
    )
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(derivedHash, "hex"),
    Buffer.from(userRecord.passwordHash, "hex")
  );
}

function sanitizeAuthUser(userRecord) {
  return {
    id: userRecord.id,
    fullName: userRecord.fullName,
    email: userRecord.email,
    employeeId: userRecord.employeeId,
    franchiseId: userRecord.franchiseId ?? null,
    role: userRecord.role,
    status: userRecord.status,
    avatar: userRecord.avatar || "",
    createdAt: userRecord.createdAt,
  };
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

function signToken(user) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Date.now();
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    franchiseId: user.franchiseId ?? null,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(unsignedToken)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${unsignedToken}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));

    if (!payload.exp || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function mapAuthUserRecord(record = {}) {
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    employeeId: record.employee_id,
    franchiseId: record.franchise_id,
    role: record.role,
    status: record.status,
    salt: record.salt,
    iterations: record.iterations,
    keyLength: record.key_length,
    digest: record.digest,
    passwordHash: record.password_hash,
    avatar: record.avatar,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

async function findUserByEmail(email) {
  const pool = await initializeDatabase();
  const result = await pool.request()
    .input("email", sql.NVarChar(255), normalizeEmail(email))
    .query(`
SELECT TOP 1
  id,
  full_name,
  email,
  employee_id,
  franchise_id,
  role,
  status,
  salt,
  iterations,
  key_length,
  digest,
  password_hash,
  avatar,
  created_at,
  updated_at
FROM dbo.auth_users
WHERE email = @email;
`);

  if (!result.recordset[0]) {
    return null;
  }

  return mapAuthUserRecord(result.recordset[0]);
}

async function findUserById(id) {
  const pool = await initializeDatabase();
  const result = await pool.request()
    .input("id", sql.Int, Number(id))
    .query(`
SELECT TOP 1
  id,
  full_name,
  email,
  employee_id,
  franchise_id,
  role,
  status,
  salt,
  iterations,
  key_length,
  digest,
  password_hash,
  avatar,
  created_at,
  updated_at
FROM dbo.auth_users
WHERE id = @id;
`);

  if (!result.recordset[0]) {
    return null;
  }

  return mapAuthUserRecord(result.recordset[0]);
}

async function getAuthUserByEmail(email) {
  const user = await findUserByEmail(email);
  return user ? sanitizeAuthUser(user) : null;
}

async function getNextId(tableName) {
  const pool = await initializeDatabase();
  const result = await pool.request().query(`
SELECT ISNULL(MAX([id]), 0) + 1 AS next_id
FROM dbo.[${tableName}];
`);

  return Number(result.recordset[0]?.next_id || 1);
}

function createAuthResponse(user) {
  return {
    token: signToken(user),
    user: sanitizeAuthUser(user),
  };
}

function createSessionToken(user) {
  return signToken(user);
}

async function getNextTableId(pool, tableName) {
  const result = await pool.request().query(`
SELECT ISNULL(MAX([id]), 0) + 1 AS next_id
FROM dbo.[${tableName}];
`);

  return Number(result.recordset[0]?.next_id || 1);
}

function buildFranchiseApprovalNotes({
  franchiseId,
  userId,
  franchiseName,
  fullName,
  email,
  employeeId,
  address,
  website,
}) {
  const meta = JSON.stringify({
    franchiseId,
    userId,
    franchiseName,
    fullName,
    email,
    employeeId,
    address,
    website,
  });

  return [
    `${FRANCHISE_APPROVAL_META_PREFIX}${meta}`,
    `Franchise registration submitted for ${franchiseName}.`,
  ].join("\n");
}

function parseFranchiseApprovalNotes(notes = "") {
  const firstLine = String(notes || "").split(/\r?\n/, 1)[0] || "";

  if (!firstLine.startsWith(FRANCHISE_APPROVAL_META_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(firstLine.slice(FRANCHISE_APPROVAL_META_PREFIX.length));
  } catch (error) {
    return null;
  }
}

async function createFranchiseAdminRegistration({
  fullName,
  email,
  employeeId,
  password,
  franchiseName,
  address,
  website,
}) {
  const normalizedFranchiseName = String(franchiseName || "").trim();
  const normalizedAddress = String(address || "").trim();
  const normalizedWebsite = String(website || "").trim();

  if (!normalizedFranchiseName) {
    const error = new Error("Franchise name is required.");
    error.statusCode = 400;
    throw error;
  }

  const pool = await initializeDatabase();
  const existingFranchiseResult = await pool.request()
    .input("company_name", sql.NVarChar(255), normalizedFranchiseName)
    .query(`
SELECT TOP 1 id
FROM dbo.franchises
WHERE LOWER(LTRIM(RTRIM(company_name))) = LOWER(LTRIM(RTRIM(@company_name)));
`);

  if (existingFranchiseResult.recordset[0]) {
    const error = new Error("Franchise name is already registered.");
    error.statusCode = 409;
    throw error;
  }

  const [nextFranchiseId, nextUserId, nextApprovalId] = await Promise.all([
    getNextTableId(pool, "franchises"),
    getNextTableId(pool, "auth_users"),
    getNextTableId(pool, "approvals"),
  ]);

  const passwordData = hashPassword(password);
  const createdAt = new Date().toISOString();
  const approvalDate = createdAt.slice(0, 10);

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("id", sql.Int, nextFranchiseId)
      .input("company_name", sql.NVarChar(255), normalizedFranchiseName)
      .input("owner_name", sql.NVarChar(255), fullName)
      .input("address", sql.NVarChar(500), normalizedAddress || null)
      .input("website", sql.NVarChar(500), normalizedWebsite || null)
      .input("logo", sql.NVarChar(500), null)
      .input("status", sql.NVarChar(50), "Pending")
      .query(`
INSERT INTO dbo.franchises (
  id, company_name, owner_name, address, website, logo, status
)
VALUES (
  @id, @company_name, @owner_name, @address, @website, @logo, @status
);
`);

    await new sql.Request(transaction)
      .input("id", sql.Int, nextUserId)
      .input("full_name", sql.NVarChar(255), fullName)
      .input("email", sql.NVarChar(255), email)
      .input("employee_id", sql.NVarChar(100), employeeId)
      .input("franchise_id", sql.Int, nextFranchiseId)
      .input("role", sql.NVarChar(50), "franchise_admin")
      .input("status", sql.NVarChar(50), "Active")
      .input("salt", sql.NVarChar(64), passwordData.salt)
      .input("iterations", sql.Int, passwordData.iterations)
      .input("key_length", sql.Int, passwordData.keyLength)
      .input("digest", sql.NVarChar(50), passwordData.digest)
      .input("password_hash", sql.NVarChar(255), passwordData.passwordHash)
      .input("avatar", sql.NVarChar(500), null)
      .input("created_at", sql.NVarChar(64), createdAt)
      .query(`
INSERT INTO dbo.auth_users (
  id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
  key_length, digest, password_hash, avatar, created_at
)
VALUES (
  @id, @full_name, @email, @employee_id, @franchise_id, @role, @status, @salt, @iterations,
  @key_length, @digest, @password_hash, @avatar, @created_at
);
`);

    await new sql.Request(transaction)
      .input("id", sql.Int, nextApprovalId)
      .input("request_type", sql.NVarChar(255), "Franchise Registration")
      .input("requested_by", sql.NVarChar(255), normalizedFranchiseName)
      .input(
        "subject",
        sql.NVarChar(500),
        `Approve ${normalizedFranchiseName} franchise admin access`
      )
      .input("date", sql.NVarChar(64), approvalDate)
      .input("priority", sql.NVarChar(50), "High")
      .input("status", sql.NVarChar(50), "Pending")
      .input(
        "notes",
        sql.NVarChar(1000),
        buildFranchiseApprovalNotes({
          franchiseId: nextFranchiseId,
          userId: nextUserId,
          franchiseName: normalizedFranchiseName,
          fullName,
          email,
          employeeId,
          address: normalizedAddress,
          website: normalizedWebsite,
        })
      )
      .query(`
INSERT INTO dbo.approvals (
  id, request_type, requested_by, subject, [date], priority, status, notes
)
VALUES (
  @id, @request_type, @requested_by, @subject, @date, @priority, @status, @notes
);
`);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    ...createAuthResponse({
      id: nextUserId,
      fullName,
      email,
      employeeId,
      franchiseId: nextFranchiseId,
      role: "franchise_admin",
    status: "Active",
    avatar: "",
    createdAt,
  }),
    message:
      "Franchise account created. You can manage your franchise now. It will appear on the home page only after super admin approval.",
    listingApprovalPending: true,
  };
}

async function registerUser({
  fullName,
  email,
  employeeId,
  password,
  role,
  franchiseName,
  address,
  website,
}) {
  const normalizedFullName = String(fullName || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedEmployeeId = String(employeeId || "").trim().toUpperCase();
  const requestedRole = role === "franchise_admin" ? "franchise_admin" : "fan_user";

  if (!normalizedFullName) {
    const error = new Error("Full name is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!normalizedEmail) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!isValidRegistrationEmail(normalizedEmail)) {
    const error = new Error("Add valid Gmail account.");
    error.statusCode = 400;
    throw error;
  }

  if (!normalizedEmployeeId) {
    const error = new Error("Employee ID is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!validatePasswordStrength(password || "")) {
    const error = new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
    error.statusCode = 400;
    throw error;
  }

  const existingUserByEmail = await findUserByEmail(normalizedEmail);

  if (role && !PUBLIC_REGISTRATION_ROLES.has(role)) {
    const error = new Error(
      "Public registration only supports fan user and franchise admin accounts. Staff and admin accounts are created internally."
    );
    error.statusCode = 403;
    throw error;
  }

  if (existingUserByEmail) {
    const error = new Error("Email is already registered.");
    error.statusCode = 409;
    throw error;
  }

  const pool = await initializeDatabase();
  const employeeIdResult = await pool.request()
    .input("employee_id", sql.NVarChar(100), normalizedEmployeeId)
    .query(`
SELECT COUNT_BIG(1) AS total
FROM dbo.auth_users
WHERE employee_id = @employee_id;
`);

  if (Number(employeeIdResult.recordset[0]?.total || 0) > 0) {
    const error = new Error("Employee ID is already registered.");
    error.statusCode = 409;
    throw error;
  }

  if (requestedRole === "franchise_admin") {
    return createFranchiseAdminRegistration({
      fullName: normalizedFullName,
      email: normalizedEmail,
      employeeId: normalizedEmployeeId,
      password,
      franchiseName,
      address,
      website,
    });
  }

  const nextId = await getNextId("auth_users");
  const passwordData = hashPassword(password);
  const nextUser = {
    id: nextId,
    fullName: normalizedFullName,
    email: normalizedEmail,
    employeeId: normalizedEmployeeId,
    franchiseId: null,
    role: "fan_user",
    status: "Active",
    avatar: "",
    createdAt: new Date().toISOString(),
    ...passwordData,
  };

  await pool.request()
    .input("id", sql.Int, nextUser.id)
    .input("full_name", sql.NVarChar(255), nextUser.fullName)
    .input("email", sql.NVarChar(255), nextUser.email)
    .input("employee_id", sql.NVarChar(100), nextUser.employeeId)
    .input("franchise_id", sql.Int, nextUser.franchiseId)
    .input("role", sql.NVarChar(50), nextUser.role)
    .input("status", sql.NVarChar(50), nextUser.status)
    .input("salt", sql.NVarChar(64), nextUser.salt)
    .input("iterations", sql.Int, nextUser.iterations)
    .input("key_length", sql.Int, nextUser.keyLength)
    .input("digest", sql.NVarChar(50), nextUser.digest)
    .input("password_hash", sql.NVarChar(255), nextUser.passwordHash)
    .input("avatar", sql.NVarChar(500), nextUser.avatar)
    .input("created_at", sql.NVarChar(64), nextUser.createdAt)
    .query(`
INSERT INTO dbo.auth_users (
  id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
  key_length, digest, password_hash, avatar, created_at
)
VALUES (
  @id, @full_name, @email, @employee_id, @franchise_id, @role, @status, @salt, @iterations,
  @key_length, @digest, @password_hash, @avatar, @created_at
);
`);

  return createAuthResponse(nextUser);
}

async function syncFranchiseRegistrationApproval(approvalRecord) {
  if (
    String(approvalRecord?.request_type || "").toLowerCase() !==
    "franchise registration"
  ) {
    return;
  }

  const meta = parseFranchiseApprovalNotes(approvalRecord.notes);

  if (!meta?.franchiseId || !meta?.userId) {
    return;
  }

  const normalizedApprovalStatus = String(approvalRecord.status || "").toLowerCase();
  const nextFranchiseStatus =
    normalizedApprovalStatus === "approved"
      ? "Approved"
      : normalizedApprovalStatus === "rejected"
      ? "Rejected"
      : "Pending";
  const updatedAt = new Date().toISOString();
  const pool = await initializeDatabase();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    await new sql.Request(transaction)
      .input("id", sql.Int, Number(meta.franchiseId))
      .input("status", sql.NVarChar(50), nextFranchiseStatus)
      .query(`
UPDATE dbo.franchises
SET status = @status
WHERE id = @id;
`);

    await new sql.Request(transaction)
      .input("id", sql.Int, Number(meta.userId))
      .input("franchise_id", sql.Int, Number(meta.franchiseId))
      .input("status", sql.NVarChar(50), "Active")
      .input("updated_at", sql.NVarChar(64), updatedAt)
      .query(`
UPDATE dbo.auth_users
SET
  franchise_id = @franchise_id,
  status = @status,
  updated_at = @updated_at
WHERE id = @id;
`);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function loginUser({ email, password, role }) {
  if (!normalizeEmail(email)) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!String(password || "").trim()) {
    const error = new Error("Password is required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user)) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (String(user.status || "").toLowerCase() !== "active") {
    const normalizedStatus = String(user.status || "").toLowerCase();
    const error = new Error(
      normalizedStatus === "pending" && user.role === "franchise_admin"
        ? "Your franchise account is waiting for super admin approval."
        : "This account is not active."
    );
    error.statusCode = 403;
    throw error;
  }

  if (role && user.role !== role) {
    const error = new Error("Selected role does not match your account.");
    error.statusCode = 403;
    throw error;
  }

  return createAuthResponse(user);
}

async function getUserFromAuthorizationHeader(authorizationHeader) {
  const token = String(authorizationHeader || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = await findUserById(payload.sub);

  if (!user || String(user.status || "").toLowerCase() !== "active") {
    return null;
  }

  return sanitizeAuthUser(user);
}

function isPrivilegedUser(user) {
  return Boolean(user && ADMIN_ROLES.has(user.role));
}

function isPlatformAdmin(user) {
  return Boolean(user && PLATFORM_ADMIN_ROLES.has(user.role));
}

function canAccessFranchiseDashboard(user) {
  return Boolean(user && FRANCHISE_DASHBOARD_ROLES.has(user.role));
}

async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error("Email is required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    return {
      message:
        "If the email exists, password reset instructions have been generated.",
    };
  }

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const pool = await initializeDatabase();
  const nextResetTokenId = await getNextId("password_reset_tokens");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const createdAt = new Date().toISOString();

  await pool.request()
    .input("user_id", sql.Int, user.id)
    .query(`
DELETE FROM dbo.password_reset_tokens
WHERE user_id = @user_id AND used_at IS NULL;
`);

  await pool.request()
    .input("id", sql.Int, nextResetTokenId)
    .input("user_id", sql.Int, user.id)
    .input("token_hash", sql.NVarChar(255), tokenHash)
    .input("expires_at", sql.NVarChar(64), expiresAt)
    .input("created_at", sql.NVarChar(64), createdAt)
    .query(`
INSERT INTO dbo.password_reset_tokens (
  id, user_id, token_hash, expires_at, created_at, used_at
)
VALUES (@id, @user_id, @token_hash, @expires_at, @created_at, NULL);
`);

  return {
    message:
      "Password reset instructions have been generated for this account.",
    resetToken: rawToken,
  };
}

async function resetPassword({ token, password }) {
  if (!String(token || "").trim()) {
    const error = new Error("Reset token is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!validatePasswordStrength(password || "")) {
    const error = new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    );
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const pool = await initializeDatabase();
  const tokenResult = await pool.request()
    .input("token_hash", sql.NVarChar(255), tokenHash)
    .query(`
SELECT TOP 1 id, user_id, expires_at, used_at
FROM dbo.password_reset_tokens
WHERE token_hash = @token_hash
ORDER BY id DESC;
`);

  const resetToken = tokenResult.recordset[0];

  if (
    !resetToken ||
    resetToken.used_at ||
    new Date(resetToken.expires_at).getTime() <= Date.now()
  ) {
    const error = new Error("Reset token is invalid or expired.");
    error.statusCode = 400;
    throw error;
  }

  const user = await findUserById(resetToken.user_id);

  if (!user) {
    const error = new Error("Account not found for the reset token.");
    error.statusCode = 404;
    throw error;
  }

  const passwordData = hashPassword(password);
  const updatedAt = new Date().toISOString();

  await pool.request()
    .input("id", sql.Int, user.id)
    .input("salt", sql.NVarChar(64), passwordData.salt)
    .input("iterations", sql.Int, passwordData.iterations)
    .input("key_length", sql.Int, passwordData.keyLength)
    .input("digest", sql.NVarChar(50), passwordData.digest)
    .input("password_hash", sql.NVarChar(255), passwordData.passwordHash)
    .input("updated_at", sql.NVarChar(64), updatedAt)
    .query(`
UPDATE dbo.auth_users
SET
  salt = @salt,
  iterations = @iterations,
  key_length = @key_length,
  digest = @digest,
  password_hash = @password_hash,
  updated_at = @updated_at
WHERE id = @id;
`);

  await pool.request()
    .input("id", sql.Int, resetToken.id)
    .input("used_at", sql.NVarChar(64), updatedAt)
    .query(`
UPDATE dbo.password_reset_tokens
SET used_at = @used_at
WHERE id = @id;
`);

  return {
    message: "Password updated successfully.",
  };
}

async function updateUserAvatar(userId, avatar) {
  const pool = await initializeDatabase();
  const updatedAt = new Date().toISOString();

  await pool.request()
    .input("id", sql.Int, Number(userId))
    .input("avatar", sql.NVarChar(500), String(avatar || "").trim() || null)
    .input("updated_at", sql.NVarChar(64), updatedAt)
    .query(`
UPDATE dbo.auth_users
SET
  avatar = @avatar,
  updated_at = @updated_at
WHERE id = @id;
`);

  return findUserById(userId);
}

module.exports = {
  canAccessFranchiseDashboard,
  createSessionToken,
  getAuthUserByEmail,
  getUserFromAuthorizationHeader,
  isPlatformAdmin,
  isPrivilegedUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  syncFranchiseRegistrationApproval,
  updateUserAvatar,
};
