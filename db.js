const path = require("path");
const { readFile } = require("fs/promises");
const sql = require("mssql");

const { PROJECT_DATA_CONFIG, RESOURCE_CONFIG } = require("./dataConfig");
const { loadEnvConfig, parseBoolean } = require("./envConfig");

const DATA_DIR = path.join(__dirname, "server-data");

const stringColumn = (length = 255) => ({
  sqlType: sql.NVarChar(length),
});

const intColumn = {
  sqlType: sql.Int,
};

const floatColumn = {
  sqlType: sql.Float,
};

const RESOURCE_TABLES = {
  teams: {
    tableName: "teams",
    columns: {
      team_name: stringColumn(255),
      city: stringColumn(255),
      owner: stringColumn(255),
      coach: stringColumn(255),
      vice_coach: stringColumn(255),
      primary_color: stringColumn(100),
      logo: stringColumn(500),
      venue: stringColumn(255),
      franchise_id: intColumn,
      status: stringColumn(50),
      budget_left: intColumn,
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.teams', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.teams (
    id INT NOT NULL PRIMARY KEY,
    team_name NVARCHAR(255) NOT NULL,
    city NVARCHAR(255) NULL,
    owner NVARCHAR(255) NULL,
    coach NVARCHAR(255) NULL,
    vice_coach NVARCHAR(255) NULL,
    primary_color NVARCHAR(100) NULL,
    logo NVARCHAR(500) NULL,
    venue NVARCHAR(255) NULL,
    franchise_id INT NULL,
    status NVARCHAR(50) NULL,
    budget_left INT NULL
  );
END;
`,
  },
  players: {
    tableName: "players",
    columns: {
      full_name: stringColumn(255),
      role: stringColumn(100),
      squad_role: stringColumn(50),
      team_id: intColumn,
      team_name: stringColumn(255),
      batting_style: stringColumn(100),
      bowling_style: stringColumn(100),
      photo: stringColumn(500),
      created_at: stringColumn(64),
      date_of_birth: stringColumn(32),
      mobile: stringColumn(50),
      email: stringColumn(255),
      status: stringColumn(50),
      salary: intColumn,
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.players', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.players (
    id INT NOT NULL PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    role NVARCHAR(100) NULL,
    squad_role NVARCHAR(50) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    batting_style NVARCHAR(100) NULL,
    bowling_style NVARCHAR(100) NULL,
    photo NVARCHAR(500) NULL,
    created_at NVARCHAR(64) NULL,
    date_of_birth NVARCHAR(32) NULL,
    mobile NVARCHAR(50) NULL,
    email NVARCHAR(255) NULL,
    status NVARCHAR(50) NULL,
    salary INT NULL
  );
END;
`,
  },
  performances: {
    tableName: "performances",
    columns: {
      player_id: intColumn,
      player_name: stringColumn(255),
      team_id: intColumn,
      team_name: stringColumn(255),
      matches: intColumn,
      runs: intColumn,
      wickets: intColumn,
      batting_average: floatColumn,
      strike_rate: floatColumn,
      economy: floatColumn,
      fours: intColumn,
      sixes: intColumn,
      best_bowling: stringColumn(50),
      dot_ball_percentage: floatColumn,
      catches: intColumn,
      stumpings: intColumn,
      updated_at: stringColumn(64),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.performances', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.performances (
    id INT NOT NULL PRIMARY KEY,
    player_id INT NOT NULL,
    player_name NVARCHAR(255) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    matches INT NULL,
    runs INT NULL,
    wickets INT NULL,
    batting_average FLOAT NULL,
    strike_rate FLOAT NULL,
    economy FLOAT NULL,
    fours INT NULL,
    sixes INT NULL,
    best_bowling NVARCHAR(50) NULL,
    dot_ball_percentage FLOAT NULL,
    catches INT NULL,
    stumpings INT NULL,
    updated_at NVARCHAR(64) NULL
  );
END;
`,
  },
  matches: {
    tableName: "matches",
    columns: {
      team_a_id: intColumn,
      team_b_id: intColumn,
      teamA: stringColumn(255),
      teamB: stringColumn(255),
      date: stringColumn(64),
      time: stringColumn(64),
      venue: stringColumn(255),
      status: stringColumn(50),
      teamAScore: stringColumn(50),
      teamBScore: stringColumn(50),
      result: stringColumn(500),
      umpire: stringColumn(255),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.matches', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.matches (
    id INT NOT NULL PRIMARY KEY,
    team_a_id INT NULL,
    team_b_id INT NULL,
    teamA NVARCHAR(255) NOT NULL,
    teamB NVARCHAR(255) NOT NULL,
    [date] NVARCHAR(64) NOT NULL,
    [time] NVARCHAR(64) NOT NULL,
    venue NVARCHAR(255) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    teamAScore NVARCHAR(50) NULL,
    teamBScore NVARCHAR(50) NULL,
    result NVARCHAR(500) NULL,
    umpire NVARCHAR(255) NULL
  );
END;
`,
  },
  venues: {
    tableName: "venues",
    columns: {
      ground_name: stringColumn(255),
      location: stringColumn(255),
      city: stringColumn(255),
      capacity: intColumn,
      contact_person: stringColumn(255),
      contact_phone: stringColumn(50),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.venues', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.venues (
    id INT NOT NULL PRIMARY KEY,
    ground_name NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    city NVARCHAR(255) NOT NULL,
    capacity INT NULL,
    contact_person NVARCHAR(255) NULL,
    contact_phone NVARCHAR(50) NULL
  );
END;
`,
  },
  franchises: {
    tableName: "franchises",
    columns: {
      company_name: stringColumn(255),
      owner_name: stringColumn(255),
      address: stringColumn(500),
      website: stringColumn(500),
      logo: stringColumn(500),
      status: stringColumn(50),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.franchises', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.franchises (
    id INT NOT NULL PRIMARY KEY,
    company_name NVARCHAR(255) NOT NULL,
    owner_name NVARCHAR(255) NULL,
    address NVARCHAR(500) NULL,
    website NVARCHAR(500) NULL,
    logo NVARCHAR(500) NULL,
    status NVARCHAR(50) NULL
  );
END;
`,
  },
  approvals: {
    tableName: "approvals",
    columns: {
      request_type: stringColumn(255),
      requested_by: stringColumn(255),
      subject: stringColumn(500),
      date: stringColumn(64),
      priority: stringColumn(50),
      status: stringColumn(50),
      notes: stringColumn(1000),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.approvals', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.approvals (
    id INT NOT NULL PRIMARY KEY,
    request_type NVARCHAR(255) NOT NULL,
    requested_by NVARCHAR(255) NOT NULL,
    subject NVARCHAR(500) NOT NULL,
    [date] NVARCHAR(64) NOT NULL,
    priority NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    notes NVARCHAR(1000) NULL
  );
END;
`,
  },
  invoices: {
    tableName: "invoices",
    columns: {
      invoice_code: stringColumn(100),
      party: stringColumn(255),
      category: stringColumn(100),
      amount: intColumn,
      due_date: stringColumn(64),
      status: stringColumn(50),
      flow: stringColumn(50),
      issued_date: stringColumn(64),
      notes: stringColumn(1000),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.invoices (
    id INT NOT NULL PRIMARY KEY,
    invoice_code NVARCHAR(100) NOT NULL,
    party NVARCHAR(255) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    amount INT NOT NULL,
    due_date NVARCHAR(64) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    flow NVARCHAR(50) NOT NULL,
    issued_date NVARCHAR(64) NULL,
    notes NVARCHAR(1000) NULL
  );
END;
`,
  },
  auctions: {
    tableName: "auctions",
    columns: {
      player_name: stringColumn(255),
      player_role: stringColumn(100),
      team_id: intColumn,
      team_name: stringColumn(255),
      base_price: intColumn,
      sold_price: intColumn,
      status: stringColumn(50),
      bid_round: intColumn,
      paddle_number: stringColumn(50),
      notes: stringColumn(1000),
    },
    createTableSql: `
IF OBJECT_ID(N'dbo.auctions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auctions (
    id INT NOT NULL PRIMARY KEY,
    player_name NVARCHAR(255) NOT NULL,
    player_role NVARCHAR(100) NULL,
    team_id INT NULL,
    team_name NVARCHAR(255) NULL,
    base_price INT NOT NULL,
    sold_price INT NULL,
    status NVARCHAR(50) NOT NULL,
    bid_round INT NULL,
    paddle_number NVARCHAR(50) NULL,
    notes NVARCHAR(1000) NULL
  );
END;
`,
  },
};

const AUTH_TABLES = {
  auth_users: {
    fileName: "auth-users.json",
    createTableSql: `
IF OBJECT_ID(N'dbo.auth_users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.auth_users (
    id INT NOT NULL PRIMARY KEY,
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    employee_id NVARCHAR(100) NOT NULL UNIQUE,
    franchise_id INT NULL,
    role NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    salt NVARCHAR(64) NOT NULL,
    iterations INT NOT NULL,
    key_length INT NOT NULL,
    digest NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at NVARCHAR(64) NOT NULL,
    updated_at NVARCHAR(64) NULL
  );
END;
`,
  },
  password_reset_tokens: {
    fileName: "password-reset-tokens.json",
    createTableSql: `
IF OBJECT_ID(N'dbo.password_reset_tokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.password_reset_tokens (
    id INT NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash NVARCHAR(255) NOT NULL,
    expires_at NVARCHAR(64) NOT NULL,
    created_at NVARCHAR(64) NOT NULL,
    used_at NVARCHAR(64) NULL
  );
END;
`,
  },
};

const PROJECT_CONTENT_TABLE_SQL = `
IF OBJECT_ID(N'dbo.project_content', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.project_content (
    resource_name NVARCHAR(100) NOT NULL PRIMARY KEY,
    content_json NVARCHAR(MAX) NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
`;

let poolPromise = null;

function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function quoteIdentifier(value) {
  return "[" + String(value).replace(/]/g, "]]" ) + "]";
}

function getDatabaseName() {
  loadEnvConfig();
  return process.env.DB_NAME || "SPLSqlServer";
}

function getBootstrapDatabaseName() {
  loadEnvConfig();
  return process.env.DB_BOOTSTRAP_DATABASE || "master";
}

function getConnectionConfig(databaseName) {
  loadEnvConfig();

  const rawServer = process.env.DB_SERVER || process.env.DB_HOST || "localhost";
  const explicitPort = Number.parseInt(process.env.DB_PORT || "", 10);
  const [serverName, instanceName] = rawServer.split("\\");
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!user || !password) {
    throw new Error(
      "Missing SQL Server credentials. Set DB_USER and DB_PASSWORD in the backend .env file."
    );
  }

  const options = {
    encrypt: parseBoolean(process.env.DB_ENCRYPT, false),
    trustServerCertificate: parseBoolean(
      process.env.DB_TRUST_SERVER_CERTIFICATE,
      true
    ),
    enableArithAbort: true,
  };

  const config = {
    user,
    password,
    server: serverName || "localhost",
    database: databaseName,
    options,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  if (Number.isInteger(explicitPort) && explicitPort > 0) {
    config.port = explicitPort;
  } else if (instanceName) {
    config.options.instanceName = instanceName;
  }

  return config;
}

async function createConnection(databaseName) {
  const pool = new sql.ConnectionPool(getConnectionConfig(databaseName));
  return pool.connect();
}

async function ensureDatabaseExists() {
  const databaseName = getDatabaseName();
  const bootstrapDatabaseName = getBootstrapDatabaseName();
  const bootstrapPool = await createConnection(bootstrapDatabaseName);

  try {
    const escapedDatabaseName = escapeSqlString(databaseName);
    const quotedDatabaseName = quoteIdentifier(databaseName);

    await bootstrapPool.request().query(`
IF DB_ID(N'${escapedDatabaseName}') IS NULL
BEGIN
  EXEC(N'CREATE DATABASE ${quotedDatabaseName}');
END;
`);
  } finally {
    await bootstrapPool.close();
  }
}

async function ensureSchema(pool) {
  await pool.request().query(PROJECT_CONTENT_TABLE_SQL);

  for (const { createTableSql } of Object.values(RESOURCE_TABLES)) {
    await pool.request().query(createTableSql);
  }

  for (const { createTableSql } of Object.values(AUTH_TABLES)) {
    await pool.request().query(createTableSql);
  }

  await pool.request().query(`
IF COL_LENGTH(N'dbo.auth_users', N'franchise_id') IS NULL
BEGIN
  ALTER TABLE dbo.auth_users
  ADD franchise_id INT NULL;
END;
`);

  await pool.request().query(`
IF COL_LENGTH(N'dbo.franchises', N'status') IS NULL
BEGIN
  ALTER TABLE dbo.franchises
  ADD status NVARCHAR(50) NULL;
END;
`);

  await pool.request().query(`
IF COL_LENGTH(N'dbo.players', N'squad_role') IS NULL
BEGIN
  ALTER TABLE dbo.players
  ADD squad_role NVARCHAR(50) NULL;
END;
`);

  await pool.request().query(`
;WITH ranked_players AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(team_id, -id)
      ORDER BY id ASC
    ) AS row_num
  FROM dbo.players
)
UPDATE players
SET squad_role = CASE
  WHEN ranked_players.row_num <= 11 THEN N'Playing XI'
  ELSE N'Reserve'
END
FROM dbo.players AS players
INNER JOIN ranked_players ON ranked_players.id = players.id
WHERE players.squad_role IS NULL OR LTRIM(RTRIM(players.squad_role)) = N'';
`);
}

async function readSeedFile(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const fileContent = await readFile(filePath, "utf8");
  return JSON.parse(fileContent);
}

function getColumnNames(resourceName) {
  return Object.keys(RESOURCE_TABLES[resourceName].columns);
}

function normalizeResourceRecord(resourceName, record = {}) {
  const normalized = { id: record.id };
  const fields = RESOURCE_CONFIG[resourceName].fields;

  for (const [fieldName, rule] of Object.entries(fields)) {
    const rawValue = record[fieldName];

    if (rawValue == null) {
      normalized[fieldName] = rule.type === "string" ? "" : null;
      continue;
    }

    normalized[fieldName] =
      rule.type === "number" ? Number(rawValue) : String(rawValue);
  }

  return normalized;
}

async function insertRecordWithId(pool, resourceName, record) {
  const table = RESOURCE_TABLES[resourceName];
  const columnNames = ["id", ...getColumnNames(resourceName)];
  const request = pool.request().input("id", sql.Int, record.id);

  for (const [fieldName, config] of Object.entries(table.columns)) {
    request.input(fieldName, config.sqlType, record[fieldName] ?? null);
  }

  const insertColumns = columnNames.map(quoteIdentifier).join(", ");
  const parameterNames = [
    "@id",
    ...getColumnNames(resourceName).map((fieldName) => `@${fieldName}`),
  ].join(", ");

  await request.query(`
INSERT INTO dbo.${quoteIdentifier(table.tableName)} (${insertColumns})
VALUES (${parameterNames});
`);
}

async function seedResourceTable(pool, resourceName) {
  const table = RESOURCE_TABLES[resourceName];
  const result = await pool.request().query(`
SELECT COUNT_BIG(1) AS total
FROM dbo.${quoteIdentifier(table.tableName)};
`);

  if (Number(result.recordset[0]?.total || 0) > 0) {
    return;
  }

  const records = await readSeedFile(RESOURCE_CONFIG[resourceName].fileName);

  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  for (const record of records) {
    await insertRecordWithId(pool, resourceName, record);
  }
}

async function seedProjectData(pool, resourceName) {
  const result = await pool.request()
    .input("resource_name", sql.NVarChar(100), resourceName)
    .query(`
SELECT COUNT_BIG(1) AS total
FROM dbo.project_content
WHERE resource_name = @resource_name;
`);

  if (Number(result.recordset[0]?.total || 0) > 0) {
    return;
  }

  const content = await readSeedFile(PROJECT_DATA_CONFIG[resourceName].fileName);

  await pool.request()
    .input("resource_name", sql.NVarChar(100), resourceName)
    .input("content_json", sql.NVarChar(sql.MAX), JSON.stringify(content))
    .query(`
INSERT INTO dbo.project_content (resource_name, content_json)
VALUES (@resource_name, @content_json);
`);
}

async function seedAuthUsers(pool) {
  const records = await readSeedFile(AUTH_TABLES.auth_users.fileName);

  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  for (const record of records) {
    const existingUserResult = await pool.request()
      .input("email", sql.NVarChar(255), record.email)
      .query(`
SELECT TOP 1 id
FROM dbo.auth_users
WHERE email = @email;
`);

    const existingUserId = existingUserResult.recordset[0]?.id;
    const targetId =
      existingUserId != null
        ? Number(existingUserId)
        : await getNextId(pool, "auth_users");

    await pool.request()
      .input("id", sql.Int, targetId)
      .input("full_name", sql.NVarChar(255), record.fullName)
      .input("email", sql.NVarChar(255), record.email)
      .input("employee_id", sql.NVarChar(100), record.employeeId)
      .input("franchise_id", sql.Int, record.franchiseId ?? null)
      .input("role", sql.NVarChar(50), record.role)
      .input("status", sql.NVarChar(50), record.status)
      .input("salt", sql.NVarChar(64), record.salt)
      .input("iterations", sql.Int, Number(record.iterations))
      .input("key_length", sql.Int, Number(record.keyLength))
      .input("digest", sql.NVarChar(50), record.digest)
      .input("password_hash", sql.NVarChar(255), record.passwordHash)
      .input("created_at", sql.NVarChar(64), record.createdAt)
      .input("updated_at", sql.NVarChar(64), record.updatedAt || null)
      .query(`
IF EXISTS (SELECT 1 FROM dbo.auth_users WHERE email = @email)
BEGIN
  UPDATE dbo.auth_users
  SET
    full_name = @full_name,
    employee_id = @employee_id,
    franchise_id = @franchise_id,
    role = @role,
    status = @status,
    salt = @salt,
    iterations = @iterations,
    key_length = @key_length,
    digest = @digest,
    password_hash = @password_hash,
    created_at = @created_at,
    updated_at = @updated_at
  WHERE email = @email;
END
ELSE
BEGIN
  INSERT INTO dbo.auth_users (
    id, full_name, email, employee_id, franchise_id, role, status, salt, iterations,
    key_length, digest, password_hash, created_at, updated_at
  )
  VALUES (
    @id, @full_name, @email, @employee_id, @franchise_id, @role, @status, @salt, @iterations,
    @key_length, @digest, @password_hash, @created_at, @updated_at
  );
END;
`);
  }
}

async function seedPasswordResetTokens(pool) {
  const result = await pool.request().query(`
SELECT COUNT_BIG(1) AS total
FROM dbo.password_reset_tokens;
`);

  if (Number(result.recordset[0]?.total || 0) > 0) {
    return;
  }

  const records = await readSeedFile(AUTH_TABLES.password_reset_tokens.fileName);

  if (!Array.isArray(records) || records.length === 0) {
    return;
  }

  for (const record of records) {
    await pool.request()
      .input("id", sql.Int, Number(record.id))
      .input("user_id", sql.Int, Number(record.userId))
      .input("token_hash", sql.NVarChar(255), record.tokenHash)
      .input("expires_at", sql.NVarChar(64), record.expiresAt)
      .input("created_at", sql.NVarChar(64), record.createdAt)
      .input("used_at", sql.NVarChar(64), record.usedAt || null)
      .query(`
INSERT INTO dbo.password_reset_tokens (
  id, user_id, token_hash, expires_at, created_at, used_at
)
VALUES (@id, @user_id, @token_hash, @expires_at, @created_at, @used_at);
`);
  }
}

async function seedDatabase(pool) {
  for (const resourceName of Object.keys(RESOURCE_TABLES)) {
    await seedResourceTable(pool, resourceName);
  }

  for (const resourceName of Object.keys(PROJECT_DATA_CONFIG)) {
    await seedProjectData(pool, resourceName);
  }

  await seedAuthUsers(pool);
  await seedPasswordResetTokens(pool);

  await pool.request().query(`
UPDATE dbo.franchises
SET status = N'Approved'
WHERE status IS NULL OR LTRIM(RTRIM(status)) = N'';
`);

  await pool.request().query(`
UPDATE dbo.auth_users
SET status = N'Active'
WHERE role = N'franchise_admin' AND status = N'Pending';
`);
}

async function initializeDatabase() {
  if (!poolPromise) {
    poolPromise = (async () => {
      await ensureDatabaseExists();
      const pool = await createConnection(getDatabaseName());
      await ensureSchema(pool);
      await seedDatabase(pool);
      return pool;
    })().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

async function getNextId(pool, tableName) {
  const result = await pool.request().query(`
SELECT ISNULL(MAX([id]), 0) + 1 AS next_id
FROM dbo.${quoteIdentifier(tableName)};
`);

  return Number(result.recordset[0]?.next_id || 1);
}

async function listCollection(resourceName) {
  const pool = await initializeDatabase();
  const table = RESOURCE_TABLES[resourceName];
  const selectColumns = ["id", ...getColumnNames(resourceName)]
    .map(quoteIdentifier)
    .join(", ");

  const result = await pool.request().query(`
SELECT ${selectColumns}
FROM dbo.${quoteIdentifier(table.tableName)}
ORDER BY [id] ASC;
`);

  return result.recordset.map((record) =>
    normalizeResourceRecord(resourceName, record)
  );
}

async function getItem(resourceName, id) {
  const pool = await initializeDatabase();
  const table = RESOURCE_TABLES[resourceName];
  const selectColumns = ["id", ...getColumnNames(resourceName)]
    .map(quoteIdentifier)
    .join(", ");

  const result = await pool.request().input("id", sql.Int, id).query(`
SELECT ${selectColumns}
FROM dbo.${quoteIdentifier(table.tableName)}
WHERE [id] = @id;
`);

  if (!result.recordset[0]) {
    return null;
  }

  return normalizeResourceRecord(resourceName, result.recordset[0]);
}

async function createItem(resourceName, payload) {
  const pool = await initializeDatabase();
  const table = RESOURCE_TABLES[resourceName];
  const nextId = await getNextId(pool, table.tableName);
  const columnNames = getColumnNames(resourceName);
  const request = pool.request().input("id", sql.Int, nextId);

  for (const [fieldName, config] of Object.entries(table.columns)) {
    request.input(fieldName, config.sqlType, payload[fieldName] ?? null);
  }

  const insertColumns = ["id", ...columnNames].map(quoteIdentifier).join(", ");
  const parameterNames = ["@id", ...columnNames.map((fieldName) => `@${fieldName}`)].join(", ");

  const result = await request.query(`
INSERT INTO dbo.${quoteIdentifier(table.tableName)} (${insertColumns})
OUTPUT INSERTED.*
VALUES (${parameterNames});
`);

  return normalizeResourceRecord(resourceName, result.recordset[0]);
}

async function replaceItem(resourceName, id, payload) {
  const pool = await initializeDatabase();
  const table = RESOURCE_TABLES[resourceName];
  const request = pool.request().input("id", sql.Int, id);
  const assignments = [];

  for (const [fieldName, config] of Object.entries(table.columns)) {
    request.input(fieldName, config.sqlType, payload[fieldName] ?? null);
    assignments.push(`${quoteIdentifier(fieldName)} = @${fieldName}`);
  }

  const result = await request.query(`
UPDATE dbo.${quoteIdentifier(table.tableName)}
SET ${assignments.join(", ")}
OUTPUT INSERTED.*
WHERE [id] = @id;
`);

  if (!result.recordset[0]) {
    return null;
  }

  return normalizeResourceRecord(resourceName, result.recordset[0]);
}

async function deleteItem(resourceName, id) {
  const pool = await initializeDatabase();
  const table = RESOURCE_TABLES[resourceName];
  const result = await pool.request().input("id", sql.Int, id).query(`
DELETE FROM dbo.${quoteIdentifier(table.tableName)}
WHERE [id] = @id;
`);

  return Number(result.rowsAffected?.[0] || 0) > 0;
}

async function getProjectData(resourceName) {
  const pool = await initializeDatabase();
  const result = await pool.request()
    .input("resource_name", sql.NVarChar(100), resourceName)
    .query(`
SELECT content_json
FROM dbo.project_content
WHERE resource_name = @resource_name;
`);

  if (!result.recordset[0]) {
    return null;
  }

  return JSON.parse(result.recordset[0].content_json);
}

async function setProjectData(resourceName, payload) {
  const pool = await initializeDatabase();

  const contentJson = JSON.stringify(payload);
  const result = await pool.request()
    .input("resource_name", sql.NVarChar(100), resourceName)
    .input("content_json", sql.NVarChar(sql.MAX), contentJson)
    .query(`
MERGE dbo.project_content AS target
USING (SELECT @resource_name AS resource_name, @content_json AS content_json) AS source
ON target.resource_name = source.resource_name
WHEN MATCHED THEN
  UPDATE SET
    content_json = source.content_json,
    updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (resource_name, content_json)
  VALUES (source.resource_name, source.content_json)
OUTPUT INSERTED.content_json;
`);

  return JSON.parse(result.recordset[0].content_json);
}

async function getDatabaseHealth() {
  const pool = await initializeDatabase();
  const result = await pool.request().query(`
SELECT DB_NAME() AS database_name;
`);

  return {
    storage: "sqlserver",
    database: result.recordset[0]?.database_name || getDatabaseName(),
  };
}

async function closeDatabase() {
  if (!poolPromise) {
    return;
  }

  try {
    const pool = await poolPromise;
    await pool.close();
  } finally {
    poolPromise = null;
  }
}

module.exports = {
  closeDatabase,
  createItem,
  deleteItem,
  getDatabaseHealth,
  getItem,
  getProjectData,
  initializeDatabase,
  listCollection,
  replaceItem,
  setProjectData,
};
