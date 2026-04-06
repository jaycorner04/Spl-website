const path = require("path");
const { mkdir } = require("fs/promises");
const { loadEnvConfig } = require("../envConfig");
const { closeDatabase, createConnection, getDatabaseName } = require("../db");

function getArgValue(flagName) {
  const argument = process.argv.slice(2).find((item) => item.startsWith(`${flagName}=`));
  return argument ? argument.slice(flagName.length + 1).trim() : "";
}

function quoteIdentifier(value) {
  return `[${String(value).replace(/]/g, "]]")}]`;
}

function buildDefaultBackupPath() {
  const backupDirectory =
    getArgValue("--dir") ||
    String(process.env.DB_BACKUP_DIR || "").trim() ||
    "C:\\spl-backups";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(backupDirectory, `${getDatabaseName()}-${timestamp}.bak`);
}

(async () => {
  loadEnvConfig(path.resolve(__dirname, ".."));

  const backupPath = path.resolve(getArgValue("--file") || buildDefaultBackupPath());
  const backupDirectory = path.dirname(backupPath);
  const databaseName = getDatabaseName();
  const pool = await createConnection(databaseName);

  try {
    await mkdir(backupDirectory, { recursive: true });
    await pool.request()
      .input("backup_path", backupPath)
      .query(`
BACKUP DATABASE ${quoteIdentifier(databaseName)}
TO DISK = @backup_path
WITH INIT, FORMAT, CHECKSUM, STATS = 10;
`);

    console.log(
      JSON.stringify(
        {
          database: databaseName,
          backupPath,
        },
        null,
        2
      )
    );
  } finally {
    await pool.close();
    await closeDatabase();
  }
})().catch((error) => {
  console.error("Database backup failed:");
  console.error(error);
  process.exitCode = 1;
});
