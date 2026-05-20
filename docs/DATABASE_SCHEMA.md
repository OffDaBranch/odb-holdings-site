# Database Schema

Migration: `migrations/0001_create_intake_tables.sql`

## `intake_leads`

Stores the canonical inquiry record, submitted contact details, classification fields, status, UTM data, and timestamps.

## `intake_events`

Stores lifecycle events for lead creation and future review/routing actions.

## `lead_sync_queue`

Stores pending outbound sync work for Airtable, Notion, and future systems. Current targets are queue stubs only; no third-party write happens from the Worker yet.

## Indexes

- `idx_intake_leads_created_at`
- `idx_intake_leads_status`
- `idx_intake_leads_inquiry_type`
- `idx_intake_events_lead_id`
- `idx_lead_sync_queue_status`
