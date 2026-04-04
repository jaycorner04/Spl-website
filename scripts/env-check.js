const path = require("path");
const { loadEnvConfig, validateServerEnv } = require("../envConfig");

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  loadEnvConfig(projectRoot);

  const validation = validateServerEnv();

  process.stdout.write(`Environment: ${validation.nodeEnv}\n`);

  if (validation.warnings.length > 0) {
    process.stdout.write("Warnings:\n");
    for (const warning of validation.warnings) {
      process.stdout.write(`- ${warning}\n`);
    }
  }

  if (validation.errors.length > 0) {
    process.stderr.write("Errors:\n");
    for (const error of validation.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Backend environment looks valid.\n");
}

main();
