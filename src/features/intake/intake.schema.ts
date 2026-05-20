import { INQUIRY_TYPES, type InquiryType, type IntakeSubmission } from "./intake.types";

export class IntakeValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super("Intake submission is invalid.");
    this.name = "IntakeValidationError";
    this.details = details;
  }
}

const INQUIRY_TYPE_ALIASES = new Map<string, InquiryType>([
  ["partnership", "Partnership"],
  ["licensing", "Licensing"],
  ["operating systems / buildouts", "Operating Systems / Buildouts"],
  ["operating systems", "Operating Systems / Buildouts"],
  ["buildouts", "Operating Systems / Buildouts"],
  ["consulting", "Operating Systems / Buildouts"],
  ["media", "Media"],
  ["general inquiry", "General Inquiry"],
  ["general", "General Inquiry"],
  ["grant / vendor readiness", "Grant / Vendor Readiness"],
  ["grant readiness", "Grant / Vendor Readiness"],
  ["vendor readiness", "Grant / Vendor Readiness"],
  ["curriculum / education program", "Curriculum / Education Program"],
  ["curriculum", "Curriculum / Education Program"],
  ["education", "Curriculum / Education Program"],
  ["contractor / property services", "Contractor / Property Services"],
  ["contractor services", "Contractor / Property Services"],
  ["property services", "Contractor / Property Services"],
  ["ai automation", "AI Automation"],
  ["automation", "AI Automation"],
  ["investment / acquisition", "Investment / Acquisition"],
  ["investment", "Investment / Acquisition"],
  ["acquisition", "Investment / Acquisition"],
]);

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const text = textValue(value);
  return text.length > 0 ? text : null;
}

function booleanValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "on" || normalized === "1" || normalized === "yes";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function normalizeSubmittedAt(value: unknown, now: Date): string {
  const raw = textValue(value);
  if (!raw) {
    return now.toISOString();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? now.toISOString() : parsed.toISOString();
}

export function normalizeInquiryType(value: unknown): InquiryType | null {
  const raw = textValue(value);
  if (!raw) {
    return null;
  }

  const exact = INQUIRY_TYPES.find((type) => type === raw);
  if (exact) {
    return exact;
  }

  return INQUIRY_TYPE_ALIASES.get(raw.toLowerCase()) ?? null;
}

export function parseIntakeSubmission(input: unknown, now = new Date()): IntakeSubmission {
  const data = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const details: string[] = [];
  const inquiryType = normalizeInquiryType(data.inquiry_type ?? data.inquiryType);
  const consent = booleanValue(data.consent_checkbox ?? data.consentCheckbox);

  const submission: IntakeSubmission = {
    name: textValue(data.name),
    email: textValue(data.email).toLowerCase(),
    phone: nullableText(data.phone),
    company: nullableText(data.company ?? data.companyName),
    inquiry_type: inquiryType ?? "General Inquiry",
    message: textValue(data.message),
    source_url: nullableText(data.source_url ?? data.sourceUrl),
    utm_source: nullableText(data.utm_source ?? data.utmSource),
    utm_medium: nullableText(data.utm_medium ?? data.utmMedium),
    utm_campaign: nullableText(data.utm_campaign ?? data.utmCampaign),
    submitted_at: normalizeSubmittedAt(data.submitted_at ?? data.submittedAt, now),
    consent_checkbox: consent,
    website: textValue(data.website),
  };

  if (!submission.name) {
    details.push("name is required");
  }

  if (!submission.email) {
    details.push("email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
    details.push("email must be valid");
  }

  if (!inquiryType) {
    details.push("inquiry_type must be one of the supported inquiry types");
  }

  if (!submission.message) {
    details.push("message is required");
  }

  if (!submission.consent_checkbox) {
    details.push("consent_checkbox is required");
  }

  if (submission.message.length > 5000) {
    details.push("message must be 5000 characters or fewer");
  }

  if (details.length > 0) {
    throw new IntakeValidationError(details);
  }

  return submission;
}
