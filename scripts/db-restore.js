const path = require("path");
const { access } = require("fs/promises");
const { constants } = require("fs");
const { loadEnvConfig } = require("../envConfig");
const { closeDatabase, createConnection, getDatabaseName } = require("../db");

function getArgValue(flagName) {
  const argument = process.argv.slice(2).find((item) => item.startsWith(`${flagName}=`));
  return argument ? argument.slice(flagName.length + 1).trim() : "";
}

function quoteIdentifier(value) {
  return `[${String(value).replace(/]/g, "]]")}]`;
}

(async () => {
  loadEnvConfig(path.resolve(__dirname, ".."));

  const backupFile = getArgValue("--file");

  if (!backupFile) {
    throw new Error("Provide the backup file path using --file=<absolute-or-relative-path>.");
  }

  const backupPath = path.resolve(backupFile);
  await access(backupPath, constants.R_OK);

  const databaseName = getDatabaseName();
  const bootstrapDatabase = String(process.env.DB_BOOTSTRAP_DATABASE || "master").trim();
  const pool = await createConnection(bootstrapDatabase);

  try {
    await pool.request()
      .input("backup_path", backupPath)
      .query(`
ALTER DATABASE ${quoteIdentifier(databaseName)}
SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

RESTORE DATABASE ${quoteIdentifier(databaseName)}
FROM DISK = @backup_path
WITH REPLACE, RECOVERY, STATS = 10;

ALTER DATABASE ${quoteIdentifier(databaseName)}
SET MULTI_USER;
`);

    console.log(
      JSON.stringify(
        {
          database: databaseName,
          restoredFrom: backupPath,
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
  console.error("Database restore failed:");
  console.error(error);
  process.exitCode = 1;
});
