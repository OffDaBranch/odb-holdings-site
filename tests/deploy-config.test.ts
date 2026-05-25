import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const GENERATOR = path.join(ROOT, "scripts", "generate_wrangler_config.mjs");
const CHECKER = path.join(ROOT, "scripts", "check_wrangler_d1_ids.mjs");
const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
const PRODUCTION_FIXTURE_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_FIXTURE_ID = "22222222-2222-4222-8222-222222222222";

function makeTemplate() {
  const directory = mkdtempSync(path.join(tmpdir(), "odb-wrangler-"));
  const source = path.join(directory, "wrangler.jsonc");
  const output = path.join(directory, "generated.jsonc");

  writeFileSync(
    source,
    JSON.stringify({
      d1_databases: [
        { binding: "DB", database_name: "branchops-intake", database_id: PLACEHOLDER },
      ],
      env: {
        preview: {
          d1_databases: [
            { binding: "DB", database_name: "branchops-intake-preview", database_id: PLACEHOLDER },
          ],
        },
      },
    }),
  );

  return { source, output };
}

describe("generated Wrangler deployment configuration", () => {
  it("injects protected D1 IDs into an untracked deploy config accepted by validation", () => {
    const { source, output } = makeTemplate();

    execFileSync("node", [GENERATOR, "--source", source, "--output", output], {
      env: {
        ...process.env,
        D1_PRODUCTION_DATABASE_ID: PRODUCTION_FIXTURE_ID,
        D1_PREVIEW_DATABASE_ID: PREVIEW_FIXTURE_ID,
      },
    });

    const generated = JSON.parse(readFileSync(output, "utf8"));
    expect(generated.d1_databases[0].database_id).toBe(PRODUCTION_FIXTURE_ID);
    expect(generated.env.preview.d1_databases[0].database_id).toBe(PREVIEW_FIXTURE_ID);
    expect(() => execFileSync("node", [CHECKER, "--config", output])).not.toThrow();
  });

  it("does not generate a deploy config when a protected D1 ID is missing", () => {
    const { source, output } = makeTemplate();
    const result = spawnSync("node", [GENERATOR, "--source", source, "--output", output], {
      encoding: "utf8",
      env: {
        ...process.env,
        D1_PRODUCTION_DATABASE_ID: PRODUCTION_FIXTURE_ID,
        D1_PREVIEW_DATABASE_ID: "",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("D1_PREVIEW_DATABASE_ID");
    expect(result.stderr).not.toContain(PRODUCTION_FIXTURE_ID);
  });
});
