const { closeDatabase, getDatabaseHealth } = require("../db");

(async () => {
  try {
    const health = await getDatabaseHealth();
    console.log(JSON.stringify(health, null, 2));
  } finally {
    await closeDatabase();
  }
})().catch((error) => {
  console.error("Database health check failed:");
  console.error(error);
  process.exitCode = 1;
});
