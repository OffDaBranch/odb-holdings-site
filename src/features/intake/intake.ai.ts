import {
  HIGH_VALUE_INQUIRY_TYPES,
  type IntakeSubmission,
  type LeadClassification,
  type LeadUrgency,
} from "./intake.types";

export type AiLeadClassifier = (
  submission: IntakeSubmission,
  fallback: LeadClassification,
) => Promise<Partial<LeadClassification>>;

export interface ClassifyLeadOptions {
  aiClassifier?: AiLeadClassifier;
}

const VALUE_RANGES: Record<string, string> = {
  Licensing: "$2,500-$25,000",
  Partnership: "$5,000-$50,000",
  "Operating Systems / Buildouts": "$5,000-$75,000",
  "Grant / Vendor Readiness": "$2,500-$25,000",
  "Curriculum / Education Program": "$5,000-$100,000",
  "Contractor / Property Services": "$1,000-$25,000",
  "AI Automation": "$2,500-$50,000",
  "Investment / Acquisition": "$25,000+",
  Media: "Non-revenue / strategic visibility",
  "General Inquiry": "Needs qualification",
};

const DEAL_TYPES: Record<string, string> = {
  Licensing: "licensing",
  Partnership: "partnership",
  "Operating Systems / Buildouts": "systems_buildout",
  "Grant / Vendor Readiness": "grant_vendor_readiness",
  "Curriculum / Education Program": "institution_program",
  "Contractor / Property Services": "property_services",
  "AI Automation": "automation_buildout",
  "Investment / Acquisition": "investment_acquisition",
  Media: "media",
  "General Inquiry": "general",
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function detectUrgency(message: string): LeadUrgency {
  const normalized = message.toLowerCase();
  if (/\b(urgent|asap|this week|immediately|deadline|closing|launch)\b/.test(normalized)) {
    return "high";
  }

  if (/\b(next month|timeline|soon|quarter|q[1-4])\b/.test(normalized)) {
    return "medium";
  }

  return "low";
}

function summarize(submission: IntakeSubmission): string {
  const company = submission.company ? ` from ${submission.company}` : "";
  const message = submission.message.replace(/\s+/g, " ");
  const excerpt = message.length > 140 ? `${message.slice(0, 137)}...` : message;
  return `${submission.inquiry_type} inquiry${company}: ${excerpt}`;
}

function buildFallbackClassification(submission: IntakeSubmission): LeadClassification {
  const highValue = HIGH_VALUE_INQUIRY_TYPES.has(submission.inquiry_type);
  const risks: string[] = [];
  let score = highValue ? 72 : 42;

  if (submission.company) {
    score += 8;
  }

  if (submission.phone) {
    score += 4;
  }

  if (submission.message.length >= 120) {
    score += 8;
  } else if (submission.message.length < 40) {
    score -= 12;
    risks.push("needs clarification");
  }

  if (submission.inquiry_type === "Licensing" || submission.inquiry_type === "Investment / Acquisition") {
    score += 8;
  }

  if (!submission.company && highValue) {
    risks.push("company missing for high-value lane");
  }

  const urgency = detectUrgency(submission.message);
  if (urgency === "high") {
    score += 6;
  }

  return {
    inquiry_summary: summarize(submission),
    lead_score: clampScore(score),
    recommended_next_action: highValue
      ? "Founder/admin review before external follow-up."
      : "Review for fit and request clarification if needed.",
    risk_flags: risks.length > 0 ? risks.join("; ") : "none",
    deal_type: DEAL_TYPES[submission.inquiry_type] ?? "general",
    urgency,
    estimated_value_range: VALUE_RANGES[submission.inquiry_type] ?? "Needs qualification",
    should_create_deal_queue_item: highValue || submission.inquiry_type === "AI Automation",
  };
}

function normalizeAiClassification(value: Partial<LeadClassification>, fallback: LeadClassification): LeadClassification {
  const urgency = value.urgency === "high" || value.urgency === "medium" || value.urgency === "low" ? value.urgency : fallback.urgency;

  return {
    inquiry_summary: typeof value.inquiry_summary === "string" && value.inquiry_summary.trim() ? value.inquiry_summary.trim() : fallback.inquiry_summary,
    lead_score: typeof value.lead_score === "number" ? clampScore(value.lead_score) : fallback.lead_score,
    recommended_next_action:
      typeof value.recommended_next_action === "string" && value.recommended_next_action.trim()
        ? value.recommended_next_action.trim()
        : fallback.recommended_next_action,
    risk_flags: typeof value.risk_flags === "string" && value.risk_flags.trim() ? value.risk_flags.trim() : fallback.risk_flags,
    deal_type: typeof value.deal_type === "string" && value.deal_type.trim() ? value.deal_type.trim() : fallback.deal_type,
    urgency,
    estimated_value_range:
      typeof value.estimated_value_range === "string" && value.estimated_value_range.trim()
        ? value.estimated_value_range.trim()
        : fallback.estimated_value_range,
    should_create_deal_queue_item:
      typeof value.should_create_deal_queue_item === "boolean"
        ? value.should_create_deal_queue_item
        : fallback.should_create_deal_queue_item,
  };
}

export async function classifyLead(
  submission: IntakeSubmission,
  options: ClassifyLeadOptions = {},
): Promise<LeadClassification> {
  const fallback = buildFallbackClassification(submission);

  if (!options.aiClassifier) {
    return fallback;
  }

  try {
    const aiResult = await options.aiClassifier(submission, fallback);
    return normalizeAiClassification(aiResult, fallback);
  } catch {
    return {
      ...fallback,
      risk_flags: fallback.risk_flags === "none" ? "AI unavailable; rule-based fallback used" : `${fallback.risk_flags}; AI unavailable`,
    };
  }
}

const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    inquiry_summary: { type: "string" },
    lead_score: { type: "number" },
    recommended_next_action: { type: "string" },
    risk_flags: { type: "string" },
    deal_type: { type: "string" },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    estimated_value_range: { type: "string" },
    should_create_deal_queue_item: { type: "boolean" },
  },
  required: [
    "inquiry_summary",
    "lead_score",
    "recommended_next_action",
    "risk_flags",
    "deal_type",
    "urgency",
    "estimated_value_range",
    "should_create_deal_queue_item",
  ],
};

function extractResponseText(responseBody: unknown): string {
  const body = responseBody as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const text = body.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text;
  if (typeof text === "string") {
    return text;
  }

  throw new Error("OpenAI response did not include output text.");
}

export function createOpenAILeadClassifier(config: {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
}): AiLeadClassifier {
  const fetcher = config.fetcher ?? fetch;
  const model = config.model ?? "gpt-5.4-mini";

  return async (submission, fallback) => {
    const response = await fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions:
          "Classify Branch Off Holdings website inquiries for human review. Do not promise funding, approval, or deal outcomes.",
        input: [
          {
            role: "user",
            content: JSON.stringify({
              submission,
              fallback,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "branchops_intake_classification",
            strict: true,
            schema: CLASSIFICATION_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI classification failed with ${response.status}.`);
    }

    return JSON.parse(extractResponseText(await response.json())) as LeadClassification;
  };
}
