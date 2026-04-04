const path = require("path");
const { readFile } = require("fs/promises");
const sql = require("mssql");

const { PROJECT_DATA_CONFIG, RESOURCE_CONFIG } = require("../dataConfig");
const { closeDatabase, initializeDatabase, setProjectData } = require("../db");

const DATA_DIR = path.join(__dirname, "..", "server-data");

function getSqlType(value) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? sql.Int : sql.Float;
  }

  return sql.NVarChar(sql.MAX);
}

async function readJsonFile(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function upsertResourceRecord(pool, resourceName, record) {
  const fieldConfig = RESOURCE_CONFIG[resourceName]?.fields || {};
  const fieldNames = Object.keys(fieldConfig);
  const tableName = resourceName;
  const request = pool.request().input("id", sql.Int, Number(record.id));

  for (const fieldName of fieldNames) {
    const value = record[fieldName] ?? null;
    request.input(fieldName, getSqlType(value), value);
  }

  const updateAssignments = fieldNames
    .map((fieldName) => `[${fieldName}] = @${fieldName}`)
    .join(",\n    ");

  const insertColumns = ["id", ...fieldNames]
    .map((fieldName) => `[${fieldName}]`)
    .join(", ");
  const insertValues = ["@id", ...fieldNames.map((fieldName) => `@${fieldName}`)].join(
    ", "
  );

  await request.query(`
IF EXISTS (SELECT 1 FROM dbo.[${tableName}] WHERE [id] = @id)
BEGIN
  UPDATE dbo.[${tableName}]
  SET ${updateAssignments}
  WHERE [id] = @id;
END
ELSE
BEGIN
  INSERT INTO dbo.[${tableName}] (${insertColumns})
  VALUES (${insertValues});
END;
`);
}

async function syncResourceTable(pool, resourceName) {
  const seedData = await readJsonFile(RESOURCE_CONFIG[resourceName].fileName);

  if (!Array.isArray(seedData)) {
    return { resourceName, count: 0 };
  }

  for (const record of seedData) {
    await upsertResourceRecord(pool, resourceName, record);
  }

  return { resourceName, count: seedData.length };
}

async function syncProjectContent(resourceName) {
  const seedContent = await readJsonFile(PROJECT_DATA_CONFIG[resourceName].fileName);
  await setProjectData(resourceName, seedContent);
  return { resourceName, type: "project-content" };
}

async function main() {
  const pool = await initializeDatabase();
  const syncedResources = [];

  for (const resourceName of Object.keys(RESOURCE_CONFIG)) {
    syncedResources.push(await syncResourceTable(pool, resourceName));
  }

  for (const resourceName of Object.keys(PROJECT_DATA_CONFIG)) {
    syncedResources.push(await syncProjectContent(resourceName));
  }

  for (const entry of syncedResources) {
    if (entry.type === "project-content") {
      process.stdout.write(`Synced project content: ${entry.resourceName}\n`);
      continue;
    }

    process.stdout.write(
      `Synced ${entry.count} records into ${entry.resourceName}\n`
    );
  }
}

main()
  .catch((error) => {
    process.stderr.write(`Seed sync failed: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
