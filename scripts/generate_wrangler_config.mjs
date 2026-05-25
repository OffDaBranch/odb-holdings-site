import fs from "node:fs";
import path from "node:path";
import { collectD1Databases, stripJsonc, validateDatabaseRecord } from "./check_wrangler_d1_ids.mjs";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function readOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  if (!args[index + 1]) {
    throw new Error(`${name} requires a path.`);
  }
  return args[index + 1];
}

function requiredValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Protected environment value ${name} is required.`);
  }
  return value;
}

function injectedIdForScope(scope) {
  if (scope === "top-level") {
    return requiredValue("D1_PRODUCTION_DATABASE_ID");
  }
  if (scope === "env.preview") {
    return requiredValue("D1_PREVIEW_DATABASE_ID");
  }
  throw new Error(`No protected D1 ID mapping is configured for ${scope}.`);
}

function main(args = process.argv.slice(2)) {
  const sourcePath = path.resolve(readOption(args, "--source", "wrangler.jsonc"));
  const outputPath = path.resolve(readOption(args, "--output", "wrangler.generated.jsonc"));

  if (sourcePath === outputPath) {
    throw new Error("Generated config output must not overwrite the tracked Wrangler template.");
  }

  const config = JSON.parse(stripJsonc(fs.readFileSync(sourcePath, "utf8")));
  const databases = collectD1Databases(config);
  if (databases.length === 0) {
    throw new Error("Wrangler template has no D1 databases to configure.");
  }

  for (const record of databases) {
    if (record.database.database_id !== ZERO_UUID) {
      throw new Error(`${record.scope} must retain a placeholder database_id in the tracked deployment template.`);
    }

    const injectedId = injectedIdForScope(record.scope);
    const errors = validateDatabaseRecord({
      ...record,
      database: { ...record.database, database_id: injectedId },
    });
    if (errors.length > 0) {
      throw new Error(`Protected D1 value for ${record.scope} failed validation: ${errors.join(" ")}`);
    }

    record.database.database_id = injectedId;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`Generated deploy-time Wrangler config at ${path.relative(process.cwd(), outputPath)}.`);
}

try {
  main();
} catch (error) {
  console.error(`D1 deploy config generation failed: ${error.message}`);
  process.exit(1);
}
