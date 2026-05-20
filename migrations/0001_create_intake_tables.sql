CREATE TABLE IF NOT EXISTS intake_leads (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  inquiry_type TEXT NOT NULL,
  message TEXT NOT NULL,
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  consent_checkbox INTEGER NOT NULL DEFAULT 0,
  inquiry_summary TEXT,
  lead_score INTEGER,
  recommended_next_action TEXT,
  deal_type TEXT,
  urgency TEXT,
  estimated_value_range TEXT,
  risk_flags TEXT,
  should_create_deal_queue_item INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  event_type TEXT NOT NULL,
  event_payload TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_sync_queue (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  target_system TEXT NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_intake_leads_created_at ON intake_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intake_leads_status ON intake_leads (status);
CREATE INDEX IF NOT EXISTS idx_intake_leads_inquiry_type ON intake_leads (inquiry_type);
CREATE INDEX IF NOT EXISTS idx_intake_events_lead_id ON intake_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sync_queue_status ON lead_sync_queue (sync_status, target_system);
