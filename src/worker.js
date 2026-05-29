const SERVICE_NAME = "odb-holdings-site";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const INQUIRY_CLASSIFICATIONS = {
  "Licensing Inquiry": {
    routing_lane: "licensing",
    routing_destination: "Licensing / IP deal review",
    routing_next_action: "Review licensing fit and prepare discovery response.",
    deal_type: "licensing",
    lead_score: 80,
    should_create_deal_queue_item: 1,
  },
  Partnership: {
    routing_lane: "partnership",
    routing_destination: "Strategic partnership review",
    routing_next_action: "Review strategic fit and schedule partnership discovery.",
    deal_type: "partnership",
    lead_score: 75,
    should_create_deal_queue_item: 1,
  },
  "Service Contract Request": {
    routing_lane: "service_contract",
    routing_destination: "Service contract intake",
    routing_next_action: "Qualify scope, budget, timeline, and decision authority.",
    deal_type: "service_contract",
    lead_score: 70,
    should_create_deal_queue_item: 1,
  },
  "Operating Systems / Buildout": {
    routing_lane: "operating_system_buildout",
    routing_destination: "Operating system buildout intake",
    routing_next_action: "Assess buildout scope and system requirements.",
    deal_type: "operating_system_buildout",
    lead_score: 75,
    should_create_deal_queue_item: 1,
  },
};

const DEFAULT_CLASSIFICATION = {
  routing_lane: "clarification_triage",
  routing_destination: "Clarification triage",
  routing_next_action: "Triage for clarification or archive.",
  deal_type: "general_inquiry",
  lead_score: 40,
  should_create_deal_queue_item: 0,
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
      }

      return jsonResponse({
        ok: true,
        service: SERVICE_NAME,
        db_bound: Boolean(env.DB),
        assets_bound: Boolean(env.ASSETS),
        checked_at: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/inquiries") {
      if (request.method !== "POST") {
        return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
      }

      return handleInquiry(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleInquiry(request, env) {
  if (!env.DB) {
    return jsonResponse({ ok: false, error: "Database binding is not configured." }, 500);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!/^application\/json(?:;|$)/i.test(contentType)) {
    return jsonResponse({ ok: false, error: "Content-Type must be application/json." }, 415);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const validationError = validateInquiry(payload);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  const now = new Date().toISOString();
  const leadId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const queueId = crypto.randomUUID();

  const name = cleanString(payload.name, 200);
  const email = cleanString(payload.email, 320).toLowerCase();
  const phone = optionalString(payload.phone, 80);
  const company = optionalString(payload.company, 200);
  const inquiryType = cleanString(payload.inquiry_type, 120);
  const message = cleanString(payload.message, 4000);
  const sourceUrl = optionalString(payload.source_url, 500) || optionalString(request.headers.get("referer"), 500);
  const utmSource = optionalString(payload.utm_source, 120);
  const utmMedium = optionalString(payload.utm_medium, 120);
  const utmCampaign = optionalString(payload.utm_campaign, 120);
  const classification = classifyInquiry(inquiryType);
  const inquirySummary = summarizeInquiry(inquiryType, message);
  const humanReviewPath = buildHumanReviewPath(classification);
  const routingOutputsJson = JSON.stringify({
    request_id: requestId,
    routing_lane: classification.routing_lane,
    routing_destination: classification.routing_destination,
    routing_next_action: classification.routing_next_action,
    deal_type: classification.deal_type,
    lead_score: classification.lead_score,
    should_create_deal_queue_item: classification.should_create_deal_queue_item,
  });

  const leadInsert = env.DB.prepare(
    `INSERT INTO intake_leads (
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
      routing_lane,
      routing_destination,
      routing_next_action,
      human_review_path,
      routing_outputs_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    leadId,
    requestId,
    name,
    email,
    phone,
    company,
    inquiryType,
    message,
    sourceUrl,
    utmSource,
    utmMedium,
    utmCampaign,
    1,
    inquirySummary,
    classification.lead_score,
    classification.routing_next_action,
    classification.deal_type,
    "standard",
    null,
    "[]",
    classification.should_create_deal_queue_item,
    "new",
    now,
    now,
    classification.routing_lane,
    classification.routing_destination,
    classification.routing_next_action,
    humanReviewPath,
    routingOutputsJson,
    now
  );

  const eventInsert = env.DB.prepare(
    `INSERT INTO intake_events (
      id,
      lead_id,
      event_type,
      event_payload,
      created_at
    ) VALUES (?, ?, ?, ?, ?)`
  ).bind(
    eventId,
    leadId,
    "inquiry_submitted",
    JSON.stringify({
      request_id: requestId,
      inquiry_type: inquiryType,
      source_url: sourceUrl,
      routing_lane: classification.routing_lane,
      routing_destination: classification.routing_destination,
    }),
    now
  );

  const queueInsert = env.DB.prepare(
    `INSERT INTO lead_sync_queue (
      id,
      lead_id,
      target_system,
      sync_status,
      attempts,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(queueId, leadId, "airtable", "pending", 0, now, now);

  await env.DB.batch([leadInsert, eventInsert, queueInsert]);

  return jsonResponse({
    ok: true,
    request_id: requestId,
    lead_id: leadId,
    status: "new",
    next_action: classification.routing_next_action,
  });
}

function validateInquiry(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "JSON payload must be an object.";
  }

  const requiredFields = ["name", "email", "inquiry_type", "message"];
  for (const field of requiredFields) {
    if (!cleanString(payload[field])) {
      return `Missing required field: ${field}.`;
    }
  }

  if (!isValidEmail(cleanString(payload.email, 320))) {
    return "Invalid email address.";
  }

  if (!hasConsent(payload.consent_checkbox)) {
    return "Consent checkbox is required.";
  }

  return null;
}

function classifyInquiry(inquiryType) {
  return INQUIRY_CLASSIFICATIONS[inquiryType] || DEFAULT_CLASSIFICATION;
}

function cleanString(value, maxLength = 1000) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function optionalString(value, maxLength = 1000) {
  const cleaned = cleanString(value, maxLength);
  return cleaned || null;
}

function hasConsent(value) {
  return value === true || value === 1 || value === "true";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function summarizeInquiry(inquiryType, message) {
  const summary = `${inquiryType}: ${message.replace(/\s+/g, " ")}`;
  return summary.slice(0, 500);
}

function buildHumanReviewPath(classification) {
  if (classification.routing_lane === DEFAULT_CLASSIFICATION.routing_lane) {
    return "Admin triage for clarification or archive.";
  }

  return `${classification.routing_destination} by founder/admin before external response.`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
