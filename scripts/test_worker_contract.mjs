import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/worker.js";

function makeEnv() {
  const statements = [];

  return {
    env: {
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              return {
                async run() {
                  statements.push({ sql, values });
                  return { success: true };
                },
              };
            },
          };
        },
      },
      ASSETS: {
        async fetch() {
          return new Response("static asset", { status: 200 });
        },
      },
    },
    statements,
  };
}

test("GET /api/health reports binding state", async () => {
  const { env } = makeEnv();

  const response = await worker.fetch(new Request("https://example.test/api/health"), env, {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "odb-holdings-site");
  assert.equal(body.db_bound, true);
  assert.equal(body.assets_bound, true);
  assert.match(body.checked_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("POST /api/inquiries stores a classified lead, event, and Airtable queue row", async () => {
  const { env, statements } = makeEnv();
  const payload = {
    name: "Validation Lead",
    email: "validation@example.com",
    phone: "555-0100",
    company: "BranchOps Test",
    inquiry_type: "Licensing Inquiry",
    message: "I want to discuss a licensing path.",
    consent_checkbox: true,
    source_url: "https://branchoffholdings.com",
  };

  const response = await worker.fetch(
    new Request("https://example.test/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    env,
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.status, "new");
  assert.equal(body.next_action, "Review licensing fit and prepare discovery response.");
  assert.match(body.request_id, /^[0-9a-f-]{36}$/i);
  assert.match(body.lead_id, /^[0-9a-f-]{36}$/i);

  assert.equal(statements.length, 3);
  assert.match(statements[0].sql, /INSERT INTO intake_leads/i);
  assert.match(statements[1].sql, /INSERT INTO intake_events/i);
  assert.match(statements[2].sql, /INSERT INTO lead_sync_queue/i);
  assert.ok(statements[0].values.includes("licensing"));
  assert.ok(statements[0].values.includes("Licensing / IP deal review"));
  assert.ok(statements[0].values.includes("licensing"));
  assert.ok(statements[0].values.includes(80));
  assert.ok(statements[0].values.includes(1));
  assert.equal(statements[1].values[2], "inquiry_submitted");
  assert.equal(statements[2].values[2], "airtable");
  assert.equal(statements[2].values[3], "pending");
});

test("POST /api/inquiries rejects invalid email", async () => {
  const { env, statements } = makeEnv();

  const response = await worker.fetch(
    new Request("https://example.test/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Bad Email",
        email: "not-an-email",
        inquiry_type: "General Inquiry",
        message: "Testing validation.",
        consent_checkbox: true,
      }),
    }),
    env,
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Invalid email address.");
  assert.equal(statements.length, 0);
});
