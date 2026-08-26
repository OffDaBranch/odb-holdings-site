import { describe, expect, it } from "vitest";
import worker from "../workers/intake-api/index";
import { classifyLead } from "../src/features/intake/intake.ai";
import { parseIntakeSubmission } from "../src/features/intake/intake.schema";
import type { IntakeLeadRow } from "../src/features/intake/intake.types";

type StoredLead = IntakeLeadRow;

class FakeD1Database {
  leads: StoredLead[] = [];
  events: Array<Record<string, unknown>> = [];
  queue: Array<Record<string, unknown>> = [];
  batches: string[][] = [];

  constructor(private readonly failOnSqlPrefix?: string) {}

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  async batch(statements: FakeD1Statement[]) {
    this.batches.push(statements.map((statement) => statement.sql));

    const checkpoint = {
      leads: this.leads.length,
      events: this.events.length,
      queue: this.queue.length,
    };

    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    } catch (error) {
      this.leads.length = checkpoint.leads;
      this.events.length = checkpoint.events;
      this.queue.length = checkpoint.queue;
      throw error;
    }
  }

  shouldFail(sql: string) {
    return this.failOnSqlPrefix !== undefined && sql.trim().startsWith(this.failOnSqlPrefix);
  }
}

class FakeD1Statement {
  private params: unknown[] = [];

  constructor(
    private readonly db: FakeD1Database,
    readonly sql: string,
  ) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async run() {
    if (this.db.shouldFail(this.sql)) {
      throw new Error(`Simulated D1 failure for ${this.sql.trim().split(" ")[0]}`);
    }

    if (this.sql.startsWith("INSERT INTO intake_leads")) {
      const [
        id,
        request_id,
        name,
        email,
        phone,
        company,
        inquiry_type,
        message,
        source_url,
        utm_source,
        utm_medium,
        utm_campaign,
        consent_checkbox,
        inquiry_summary,
        lead_score,
        recommended_next_action,
        deal_type,
        urgency,
        estimated_value_range,
        risk_flags,
        should_create_deal_queue_item,
        status,
        submitted_at,
        created_at,
      ] = this.params;

      this.db.leads.push({
        id: String(id),
        request_id: String(request_id),
        name: String(name),
        email: String(email),
        phone: phone === null ? null : String(phone),
        company: company === null ? null : String(company),
        inquiry_type: String(inquiry_type),
        message: String(message),
        source_url: source_url === null ? null : String(source_url),
        utm_source: utm_source === null ? null : String(utm_source),
        utm_medium: utm_medium === null ? null : String(utm_medium),
        utm_campaign: utm_campaign === null ? null : String(utm_campaign),
        consent_checkbox: Number(consent_checkbox),
        inquiry_summary: String(inquiry_summary),
        lead_score: Number(lead_score),
        recommended_next_action: String(recommended_next_action),
        deal_type: String(deal_type),
        urgency: String(urgency),
        estimated_value_range: String(estimated_value_range),
        risk_flags: String(risk_flags),
        should_create_deal_queue_item: Number(should_create_deal_queue_item),
        status: String(status),
        submitted_at: String(submitted_at),
        created_at: String(created_at),
      });
    } else if (this.sql.startsWith("INSERT INTO intake_events")) {
      this.db.events.push({
        id: this.params[0],
        lead_id: this.params[1],
        event_type: this.params[2],
        event_payload: this.params[3],
        created_at: this.params[4],
      });
    } else if (this.sql.startsWith("INSERT INTO lead_sync_queue")) {
      this.db.queue.push({
        id: this.params[0],
        lead_id: this.params[1],
        target_system: this.params[2],
        sync_status: this.params[3],
        attempts: this.params[4],
        last_error: this.params[5],
        created_at: this.params[6],
        updated_at: this.params[7],
      });
    }

    return { success: true };
  }

  async all<T>() {
    if (this.sql.startsWith("SELECT * FROM intake_leads")) {
      return { results: this.db.leads as T[] };
    }

    return { results: [] as T[] };
  }

  async first<T>() {
    return null as T | null;
  }
}

function makeEnv(db = new FakeD1Database()) {
  return {
    DB: db,
    ADMIN_BEARER_TOKEN: "admin-secret",
    ASSETS: {
      fetch: async () => new Response("asset", { status: 200 }),
    },
  };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jordan Smith",
    email: "jordan@example.com",
    phone: "404-555-0100",
    company: "Example Partners",
    inquiry_type: "Licensing",
    message: "We want to license a workflow system for a regional contractor program with implementation support.",
    source_url: "https://branchoffholdings.com/contact?utm_source=test",
    utm_source: "test",
    utm_medium: "integration",
    utm_campaign: "intake-mvp",
    submitted_at: "2026-05-20T10:00:00.000Z",
    consent_checkbox: true,
    ...overrides,
  };
}

async function postIntake(payload: Record<string, unknown>, env = makeEnv()) {
  return worker.fetch(
    new Request("https://branchoffholdings.com/api/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
    env as never,
  );
}

describe("BranchOps intake API", () => {
  it("stores a valid intake submission and returns a request id", async () => {
    const db = new FakeD1Database();
    const response = await postIntake(validPayload(), makeEnv(db));
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(201);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.lead_id).toMatch(/^lead_/);
    expect(db.leads).toHaveLength(1);
    expect(db.leads[0].email).toBe("jordan@example.com");
    expect(db.leads[0].inquiry_type).toBe("Licensing");
    expect(db.leads[0].lead_score).toBeGreaterThanOrEqual(70);
    expect(db.events).toHaveLength(1);
    expect(db.queue.map((item) => item.target_system)).toEqual([
      "airtable:website_inquiries",
      "airtable:deal_queue",
      "notion:lead_routing_sop",
    ]);
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toHaveLength(5);
  });

  it("rolls back the accepted lead when any batched write fails", async () => {
    const db = new FakeD1Database("INSERT INTO lead_sync_queue");

    await expect(postIntake(validPayload(), makeEnv(db))).rejects.toThrow("Simulated D1 failure");
    expect(db.batches).toHaveLength(1);
    expect(db.leads).toHaveLength(0);
    expect(db.events).toHaveLength(0);
    expect(db.queue).toHaveLength(0);
  });

  it("rejects missing required fields with structured JSON", async () => {
    const response = await postIntake(validPayload({ name: "", message: "" }));
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(400);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details).toContain("name is required");
    expect(body.error.details).toContain("message is required");
  });

  it("rejects invalid email addresses", async () => {
    const response = await postIntake(validPayload({ email: "not-an-email" }));
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details).toContain("email must be valid");
  });

  it("rejects admin lead access without a bearer token", async () => {
    const response = await worker.fetch(
      new Request("https://branchoffholdings.com/api/admin/leads"),
      makeEnv() as never,
    );
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(401);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns leads for authorized admin requests", async () => {
    const db = new FakeD1Database();
    const env = makeEnv(db);
    await postIntake(validPayload(), env);

    const response = await worker.fetch(
      new Request("https://branchoffholdings.com/api/admin/leads", {
        headers: { authorization: "Bearer admin-secret" },
      }),
      env as never,
    );
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(200);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].email).toBe("jordan@example.com");
  });

  it("reports when admin routes are not configured", async () => {
    const env = {
      ...makeEnv(),
      ADMIN_BEARER_TOKEN: "",
    };

    const response = await worker.fetch(
      new Request("https://branchoffholdings.com/api/admin/leads", {
        headers: { authorization: "Bearer admin-secret" },
      }),
      env as never,
    );
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("admin_not_configured");
  });

  it("requires authorization for CSV export", async () => {
    const response = await worker.fetch(
      new Request("https://branchoffholdings.com/api/admin/export.csv"),
      makeEnv() as never,
    );
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(401);
    expect(body.request_id).toMatch(/^req_/);
    expect(body.error.code).toBe("unauthorized");
  });

  it("falls back to rule-based classification when AI is unavailable", async () => {
    const classification = await classifyLead(parseIntakeSubmission(validPayload()), {
      aiClassifier: async () => {
        throw new Error("AI unavailable");
      },
    });

    expect(classification.inquiry_summary).toContain("Licensing");
    expect(classification.lead_score).toBeGreaterThanOrEqual(70);
    expect(classification.risk_flags).toContain("AI unavailable");
    expect(classification.should_create_deal_queue_item).toBe(true);
  });
});
