import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "wrangler.jsonc");
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stripJsonc(input) {
  let output = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function collectD1Databases(config) {
  const records = [];

  if (Array.isArray(config.d1_databases)) {
    for (const database of config.d1_databases) {
      records.push({ scope: "top-level", database });
    }
  }

  if (config.env && typeof config.env === "object") {
    for (const [envName, envConfig] of Object.entries(config.env)) {
      if (!envConfig || typeof envConfig !== "object") continue;
      if (!Array.isArray(envConfig.d1_databases)) continue;

      for (const database of envConfig.d1_databases) {
        records.push({ scope: `env.${envName}`, database });
      }
    }
  }

  return records;
}

function validateDatabaseRecord({ scope, database }) {
  const errors = [];
  const binding = database?.binding ?? "<missing binding>";
  const databaseName = database?.database_name ?? "<missing database_name>";
  const databaseId = database?.database_id ?? "";
  const label = `${scope} binding=${binding} database_name=${databaseName}`;

  if (!database?.binding) {
    errors.push(`${scope} has a D1 database entry without binding.`);
  }

  if (!database?.database_name) {
    errors.push(`${scope} binding=${binding} is missing database_name.`);
  }

  if (!databaseId) {
    errors.push(`${label} is missing database_id.`);
  } else if (databaseId === ZERO_UUID) {
    errors.push(`${label} still uses the all-zero placeholder database_id.`);
  } else if (databaseId.includes("REAL_DATABASE_ID") || databaseId.includes("PRODUCTION_DATABASE_ID") || databaseId.includes("STAGING_DATABASE_ID")) {
    errors.push(`${label} still uses a textual placeholder database_id.`);
  } else if (!UUID_PATTERN.test(databaseId)) {
    errors.push(`${label} database_id is not a valid UUID format.`);
  }

  return errors;
}

function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("D1 binding check failed: wrangler.jsonc was not found.");
    process.exit(1);
  }

  const rawConfig = fs.readFileSync(CONFIG_PATH, "utf8");
  let config;

  try {
    config = JSON.parse(stripJsonc(rawConfig));
  } catch (error) {
    console.error("D1 binding check failed: wrangler.jsonc could not be parsed.");
    console.error(error.message);
    process.exit(1);
  }

  const d1Databases = collectD1Databases(config);
  if (d1Databases.length === 0) {
    console.log("D1 binding check passed: no D1 databases are configured.");
    return;
  }

  const errors = d1Databases.flatMap(validateDatabaseRecord);
  if (errors.length > 0) {
    console.error("D1 binding check failed. Replace placeholder D1 database IDs before deployment:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    console.error("\nRun: npx wrangler d1 list --json");
    console.error("Then update wrangler.jsonc with the matching database_id for each database_name.");
    process.exit(1);
  }

  console.log(`D1 binding check passed: ${d1Databases.length} configured D1 database binding(s) have valid UUIDs.`);
}

main();
