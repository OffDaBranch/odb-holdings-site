export const INQUIRY_TYPES = [
  "Partnership",
  "Licensing",
  "Operating Systems / Buildouts",
  "Media",
  "General Inquiry",
  "Grant / Vendor Readiness",
  "Curriculum / Education Program",
  "Contractor / Property Services",
  "AI Automation",
  "Investment / Acquisition",
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const HIGH_VALUE_INQUIRY_TYPES: ReadonlySet<InquiryType> = new Set([
  "Licensing",
  "Partnership",
  "Operating Systems / Buildouts",
  "Grant / Vendor Readiness",
  "Curriculum / Education Program",
  "Investment / Acquisition",
]);

export type LeadUrgency = "low" | "medium" | "high";

export interface IntakeSubmission {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiry_type: InquiryType;
  message: string;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  submitted_at: string;
  consent_checkbox: boolean;
  website?: string;
}

export interface LeadClassification {
  inquiry_summary: string;
  lead_score: number;
  recommended_next_action: string;
  risk_flags: string;
  deal_type: string;
  urgency: LeadUrgency;
  estimated_value_range: string;
  should_create_deal_queue_item: boolean;
}

export interface IntakeLeadRow {
  id: string;
  request_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiry_type: string;
  message: string;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  consent_checkbox: number;
  inquiry_summary: string;
  lead_score: number;
  recommended_next_action: string;
  deal_type: string;
  urgency: string;
  estimated_value_range: string;
  risk_flags: string;
  should_create_deal_queue_item: number;
  status: string;
  submitted_at: string;
  created_at: string;
}

export interface IntakeCreateResult {
  lead: IntakeLeadRow;
  queuedTargets: string[];
}

export interface IntakeApiEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
  ADMIN_BEARER_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

export interface IntakeEventPayload {
  request_id: string;
  inquiry_type: InquiryType;
  lead_score: number;
  should_create_deal_queue_item: boolean;
}
