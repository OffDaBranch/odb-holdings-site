import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/worker.js";

const LEAD_COLUMNS = [
  "id",
  "request_id",
  "name",
  "email",
  "phone",
  "company",
  "inquiry_type",
  "message",
  "source_url",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "consent_checkbox",
  "inquiry_summary",
  "lead_score",
  "recommended_next_action",
  "deal_type",
  "urgency",
  "estimated_value_range",
  "risk_flags",
  "should_create_deal_queue_item",
  "status",
  "submitted_at",
  "created_at",
  "routing_lane",
  "routing_destination",
  "routing_next_action",
  "human_review_path",
  "routing_outputs_json",
  "updated_at",
];

const CLASSIFICATION_CASES = [
  {
    inquiry_type: "Licensing Inquiry",
    routing_lane: "licensing",
    routing_destination: "Licensing / IP deal review",
    routing_next_action: "Review licensing fit and prepare discovery response.",
    deal_type: "licensing",
    lead_score: 80,
    should_create_deal_queue_item: 1,
  },
  {
    inquiry_type: "Partnership",
    routing_lane: "partnership",
    routing_destination: "Strategic partnership review",
    routing_next_action: "Review strategic fit and schedule partnership discovery.",
    deal_type: "partnership",
    lead_score: 75,
    should_create_deal_queue_item: 1,
  },
  {
    inquiry_type: "Service Contract Request",
    routing_lane: "service_contract",
    routing_destination: "Service contract intake",
    routing_next_action: "Qualify scope, budget, timeline, and decision authority.",
    deal_type: "service_contract",
    lead_score: 70,
    should_create_deal_queue_item: 1,
  },
  {
    inquiry_type: "Operating Systems / Buildout",
    routing_lane: "operating_system_buildout",
    routing_destination: "Operating system buildout intake",
    routing_next_action: "Assess buildout scope and system requirements.",
    deal_type: "operating_system_buildout",
    lead_score: 75,
    should_create_deal_queue_item: 1,
  },
  {
    inquiry_type: "General Inquiry",
    routing_lane: "clarification_triage",
    routing_destination: "Clarification triage",
    routing_next_action: "Triage for clarification or archive.",
    deal_type: "general_inquiry",
    lead_score: 40,
    should_create_deal_queue_item: 0,
  },
];

function makeEnv() {
  const statements = [];
  const assetRequests = [];

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
        async fetch(request) {
          assetRequests.push(request);
          return new Response("static asset", { status: 200 });
        },
      },
    },
    statements,
    assetRequests,
  };
}

function buildPayload(overrides = {}) {
  return {
    name: "Validation Lead",
    email: "validation@example.com",
    phone: "555-0100",
    company: "BranchOps Test",
    inquiry_type: "Licensing Inquiry",
    message: "I want to discuss a licensing path.",
    consent_checkbox: true,
    source_url: "https://branchoffholdings.com",
    ...overrides,
  };
}

async function postInquiry(env, payload, headers = { "content-type": "application/json" }) {
  return worker.fetch(
    new Request("https://example.test/api/inquiries", {
      method: "POST",
      headers,
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
    env,
    {}
  );
}

function leadRowFromStatements(statements) {
  const leadInsert = statements.find((statement) => /INSERT INTO intake_leads/i.test(statement.sql));
  assert.ok(leadInsert, "expected intake_leads insert");
  assert.equal(leadInsert.values.length, LEAD_COLUMNS.length);

  return Object.fromEntries(LEAD_COLUMNS.map((column, index) => [column, leadInsert.values[index]]));
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
  const payload = buildPayload();

  const response = await postInquiry(env, payload);
  const body = await response.json();
  const leadRow = leadRowFromStatements(statements);

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

  assert.equal(leadRow.id, body.lead_id);
  assert.equal(leadRow.request_id, body.request_id);
  assert.equal(leadRow.name, payload.name);
  assert.equal(leadRow.email, payload.email);
  assert.equal(leadRow.consent_checkbox, 1);
  assert.equal(leadRow.status, "new");
  assert.equal(leadRow.routing_lane, "licensing");
  assert.equal(leadRow.routing_destination, "Licensing / IP deal review");
  assert.equal(leadRow.routing_next_action, "Review licensing fit and prepare discovery response.");
  assert.equal(leadRow.deal_type, "licensing");
  assert.equal(leadRow.lead_score, 80);
  assert.equal(leadRow.should_create_deal_queue_item, 1);

  assert.equal(statements[1].values[1], body.lead_id);
  assert.equal(statements[1].values[2], "inquiry_submitted");
  assert.equal(statements[2].values[1], body.lead_id);
  assert.equal(statements[2].values[2], "airtable");
  assert.equal(statements[2].values[3], "pending");
});

for (const field of ["name", "email", "inquiry_type", "message"]) {
  test(`POST /api/inquiries rejects missing required field: ${field}`, async () => {
    const { env, statements } = makeEnv();
    const payload = buildPayload({ [field]: "   " });

    const response = await postInquiry(env, payload);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.error, `Missing required field: ${field}.`);
    assert.equal(statements.length, 0);
  });
}

test("POST /api/inquiries rejects invalid email", async () => {
  const { env, statements } = makeEnv();

  const response = await postInquiry(env, buildPayload({ email: "not-an-email" }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Invalid email address.");
  assert.equal(statements.length, 0);
});

test("POST /api/inquiries rejects missing consent_checkbox", async () => {
  const { env, statements } = makeEnv();
  const payload = buildPayload();
  delete payload.consent_checkbox;

  const response = await postInquiry(env, payload);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Consent checkbox is required.");
  assert.equal(statements.length, 0);
});

test("POST /api/inquiries rejects unsupported content-type", async () => {
  const { env, statements } = makeEnv();

  const response = await postInquiry(env, "name=Validation", {
    "content-type": "application/x-www-form-urlencoded",
  });
  const body = await response.json();

  assert.equal(response.status, 415);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Content-Type must be application/json.");
  assert.equal(statements.length, 0);
});

test("unknown routes fall back to static assets", async () => {
  const { env, assetRequests } = makeEnv();

  const response = await worker.fetch(new Request("https://example.test/not-an-api-route"), env, {});
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(body, "static asset");
  assert.equal(assetRequests.length, 1);
  assert.equal(new URL(assetRequests[0].url).pathname, "/not-an-api-route");
});

for (const expected of CLASSIFICATION_CASES) {
  test(`POST /api/inquiries classifies ${expected.inquiry_type}`, async () => {
    const { env, statements } = makeEnv();

    const response = await postInquiry(env, buildPayload({ inquiry_type: expected.inquiry_type }));
    const body = await response.json();
    const leadRow = leadRowFromStatements(statements);
    const routingOutputs = JSON.parse(leadRow.routing_outputs_json);

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.next_action, expected.routing_next_action);
    assert.equal(leadRow.inquiry_type, expected.inquiry_type);
    assert.equal(leadRow.routing_lane, expected.routing_lane);
    assert.equal(leadRow.routing_destination, expected.routing_destination);
    assert.equal(leadRow.routing_next_action, expected.routing_next_action);
    assert.equal(leadRow.recommended_next_action, expected.routing_next_action);
    assert.equal(leadRow.deal_type, expected.deal_type);
    assert.equal(leadRow.lead_score, expected.lead_score);
    assert.equal(leadRow.should_create_deal_queue_item, expected.should_create_deal_queue_item);
    assert.equal(routingOutputs.routing_lane, expected.routing_lane);
    assert.equal(routingOutputs.deal_type, expected.deal_type);
    assert.equal(routingOutputs.lead_score, expected.lead_score);
    assert.equal(routingOutputs.should_create_deal_queue_item, expected.should_create_deal_queue_item);
  });
}
