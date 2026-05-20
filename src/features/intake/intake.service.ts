import type { IntakeCreateResult, IntakeEventPayload, IntakeLeadRow, IntakeSubmission, LeadClassification } from "./intake.types";

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function queueTargetsForLead(classification: LeadClassification): string[] {
  const targets = ["airtable:website_inquiries"];

  if (classification.should_create_deal_queue_item) {
    targets.push("airtable:deal_queue");
  }

  targets.push("notion:lead_routing_sop");
  return targets;
}

export async function createIntakeLead(params: {
  db: D1Database;
  submission: IntakeSubmission;
  classification: LeadClassification;
  requestId: string;
  now?: Date;
}): Promise<IntakeCreateResult> {
  const now = params.now ?? new Date();
  const createdAt = now.toISOString();
  const leadId = createId("lead");
  const lead: IntakeLeadRow = {
    id: leadId,
    request_id: params.requestId,
    name: params.submission.name,
    email: params.submission.email,
    phone: params.submission.phone,
    company: params.submission.company,
    inquiry_type: params.submission.inquiry_type,
    message: params.submission.message,
    source_url: params.submission.source_url,
    utm_source: params.submission.utm_source,
    utm_medium: params.submission.utm_medium,
    utm_campaign: params.submission.utm_campaign,
    consent_checkbox: boolToInt(params.submission.consent_checkbox),
    inquiry_summary: params.classification.inquiry_summary,
    lead_score: params.classification.lead_score,
    recommended_next_action: params.classification.recommended_next_action,
    deal_type: params.classification.deal_type,
    urgency: params.classification.urgency,
    estimated_value_range: params.classification.estimated_value_range,
    risk_flags: params.classification.risk_flags,
    should_create_deal_queue_item: boolToInt(params.classification.should_create_deal_queue_item),
    status: "new",
    submitted_at: params.submission.submitted_at,
    created_at: createdAt,
  };

  await params.db
    .prepare(
      `INSERT INTO intake_leads (
        id, request_id, name, email, phone, company, inquiry_type, message, source_url,
        utm_source, utm_medium, utm_campaign, consent_checkbox, inquiry_summary, lead_score,
        recommended_next_action, deal_type, urgency, estimated_value_range, risk_flags,
        should_create_deal_queue_item, status, submitted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      lead.id,
      lead.request_id,
      lead.name,
      lead.email,
      lead.phone,
      lead.company,
      lead.inquiry_type,
      lead.message,
      lead.source_url,
      lead.utm_source,
      lead.utm_medium,
      lead.utm_campaign,
      lead.consent_checkbox,
      lead.inquiry_summary,
      lead.lead_score,
      lead.recommended_next_action,
      lead.deal_type,
      lead.urgency,
      lead.estimated_value_range,
      lead.risk_flags,
      lead.should_create_deal_queue_item,
      lead.status,
      lead.submitted_at,
      lead.created_at,
    )
    .run();

  const eventPayload: IntakeEventPayload = {
    request_id: params.requestId,
    inquiry_type: params.submission.inquiry_type,
    lead_score: params.classification.lead_score,
    should_create_deal_queue_item: params.classification.should_create_deal_queue_item,
  };

  await params.db
    .prepare("INSERT INTO intake_events (id, lead_id, event_type, event_payload, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(createId("evt"), lead.id, "lead.created", JSON.stringify(eventPayload), createdAt)
    .run();

  const queuedTargets = queueTargetsForLead(params.classification);

  for (const target of queuedTargets) {
    await params.db
      .prepare(
        "INSERT INTO lead_sync_queue (id, lead_id, target_system, sync_status, attempts, last_error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(createId("sync"), lead.id, target, "pending", 0, null, createdAt, null)
      .run();
  }

  return { lead, queuedTargets };
}

export async function listIntakeLeads(db: D1Database, limit = 100): Promise<IntakeLeadRow[]> {
  const boundedLimit = Math.max(1, Math.min(500, Math.floor(limit)));
  const result = await db.prepare("SELECT * FROM intake_leads ORDER BY created_at DESC LIMIT ?").bind(boundedLimit).all<IntakeLeadRow>();
  return result.results ?? [];
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function leadsToCsv(leads: IntakeLeadRow[]): string {
  const columns: Array<keyof IntakeLeadRow> = [
    "id",
    "request_id",
    "name",
    "email",
    "phone",
    "company",
    "inquiry_type",
    "lead_score",
    "urgency",
    "deal_type",
    "estimated_value_range",
    "recommended_next_action",
    "risk_flags",
    "status",
    "submitted_at",
    "created_at",
  ];

  const header = columns.join(",");
  const rows = leads.map((lead) => columns.map((column) => csvCell(lead[column])).join(","));
  return [header, ...rows].join("\n");
}
