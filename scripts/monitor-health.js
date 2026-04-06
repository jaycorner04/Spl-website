const path = require("path");
const { loadEnvConfig } = require("../envConfig");

function getArgValue(flagName) {
  const argument = process.argv.slice(2).find((item) => item.startsWith(`${flagName}=`));
  return argument ? argument.slice(flagName.length + 1).trim() : "";
}

(async () => {
  loadEnvConfig(path.resolve(__dirname, ".."));

  const baseUrl = getArgValue("--base-url") || process.env.MONITOR_BASE_URL || "http://127.0.0.1:4000";
  const monitoringToken = String(process.env.SPL_MONITORING_TOKEN || "").trim();
  const headers = monitoringToken
    ? { "x-monitoring-token": monitoringToken }
    : {};

  const [healthResponse, metricsResponse] = await Promise.all([
    fetch(`${baseUrl.replace(/\/+$/, "")}/api/health`, {
      headers,
    }),
    fetch(`${baseUrl.replace(/\/+$/, "")}/api/metrics`, {
      headers,
    }),
  ]);

  const [healthPayload, metricsPayload] = await Promise.all([
    healthResponse.json(),
    metricsResponse.json(),
  ]);

  if (!healthResponse.ok) {
    throw new Error(`Health check failed: ${JSON.stringify(healthPayload)}`);
  }

  if (!metricsResponse.ok) {
    throw new Error(`Metrics check failed: ${JSON.stringify(metricsPayload)}`);
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        health: healthPayload,
        metrics: metricsPayload,
      },
      null,
      2
    )
  );
})().catch((error) => {
  console.error("Monitoring check failed:");
  console.error(error);
  process.exitCode = 1;
});
