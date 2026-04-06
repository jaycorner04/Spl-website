const { closeDatabase, getMigrationStatus, initializeDatabase } = require("../db");

(async () => {
  try {
    await initializeDatabase();
    const appliedMigrations = await getMigrationStatus();
    console.log(
      JSON.stringify(
        {
          applied: appliedMigrations.length,
          migrations: appliedMigrations,
        },
        null,
        2
      )
    );
  } finally {
    await closeDatabase();
  }
})().catch((error) => {
  console.error("Database migration failed:");
  console.error(error);
  process.exitCode = 1;
});
