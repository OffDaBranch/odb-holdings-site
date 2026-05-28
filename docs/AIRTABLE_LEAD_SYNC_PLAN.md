# Airtable Lead Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync website inquiry leads from Cloudflare D1 to Airtable without changing the production D1 schema or risking duplicate live Airtable records.

**Architecture:** D1 remains the source of record. `/api/inquiries` stores the lead, audit event, and pending Airtable queue row; a future secret-protected sync route drains `lead_sync_queue` into one Airtable table using idempotent upsert keyed by `Lead ID`. A scheduled handler can reuse the same sync function later, after the manual route is proven with a one-record canary.

**Tech Stack:** Cloudflare Workers, Cloudflare D1, Wrangler, Airtable Web API, Node test runner.

---

## Objective

Prepare the next implementation slice for syncing Branch Off Holdings website inquiry leads from Cloudflare D1 into Airtable.

This is a documentation-only planning slice. It does not deploy, commit, write Airtable records, or change the production D1 schema.

## Classification

- Automation
- Infrastructure
- Revenue
- Asset
- Documentation

## Repo Context Read

- `src/worker.js`: `POST /api/inquiries` validates JSON inquiries, classifies the lead, inserts into `intake_leads`, inserts an `inquiry_submitted` record into `intake_events`, and inserts a pending `lead_sync_queue` row with `target_system = "airtable"`.
- `wrangler.jsonc`: Worker name is `odb-holdings-site`; main module is `src/worker.js`; D1 binding is `DB` for database `branchops-intake`; static assets use `ASSETS`; observability is enabled.
- `scripts/test_worker_contract.mjs`: contract tests assert successful lead/event/Airtable queue creation plus validation failures and classification outputs.
- `docs/WEBSITE_INQUIRY_INTAKE_BACKEND_VALIDATION.md`: production intake was validated, including live D1 proof for `intake_leads`, `intake_events`, and `lead_sync_queue`.
- `README.md`: site is intended to stay a clean public holdings site; validation runs through `scripts/validate_site.py`.
- `.github/workflows/validate-site.yml`: CI runs the static site validator on pushes and pull requests.

## Current State

The website has a durable lead intake pipeline:

1. Visitor submits an inquiry to `POST /api/inquiries`.
2. Worker stores the lead in `intake_leads`.
3. Worker stores an audit event in `intake_events`.
4. Worker stores an Airtable sync work item in `lead_sync_queue`.

There is not yet any code that calls Airtable.

## Source D1 Tables

### `intake_leads`

Primary lead source. Use these columns for Airtable field mapping:

- `id`
- `request_id`
- `name`
- `email`
- `phone`
- `company`
- `inquiry_type`
- `message`
- `source_url`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `consent_checkbox`
- `inquiry_summary`
- `lead_score`
- `recommended_next_action`
- `deal_type`
- `urgency`
- `estimated_value_range`
- `risk_flags`
- `should_create_deal_queue_item`
- `status`
- `submitted_at`
- `created_at`
- `routing_lane`
- `routing_destination`
- `routing_next_action`
- `human_review_path`
- `routing_outputs_json`
- `updated_at`

### `lead_sync_queue`

Queue source for Airtable sync work:

- `id`
- `lead_id`
- `target_system`
- `sync_status`
- `attempts`
- `created_at`
- `updated_at`

Only rows where `target_system = "airtable"` should be considered.

### `intake_events`

Audit and failure logging table:

- `id`
- `lead_id`
- `event_type`
- `event_payload`
- `created_at`

Use this table for sync start, success, retry, and failure records. Do not add columns in the first sync slice.

## Target Airtable Table

Target base: BranchOps execution or sales operations base selected by the owner.

Target table: `Website Inquiry Leads`

Recommended primary field: `Lead ID`

Use Airtable table ID in Worker configuration when possible. Table names can change; table IDs are safer for integrations.

## Required Airtable Fields

| Airtable field | Type | D1 source | Notes |
| --- | --- | --- | --- |
| `Lead ID` | Single line text | `intake_leads.id` | Required unique external key for upsert. |
| `Request ID` | Single line text | `intake_leads.request_id` | Public request correlation ID. |
| `Submitted At` | Date with time | `intake_leads.submitted_at` | Visitor submission timestamp. |
| `Name` | Single line text | `intake_leads.name` | Required intake field. |
| `Email` | Email | `intake_leads.email` | Required intake field. |
| `Phone` | Phone number | `intake_leads.phone` | Optional intake field. |
| `Company` | Single line text | `intake_leads.company` | Optional intake field. |
| `Inquiry Type` | Single select | `intake_leads.inquiry_type` | Seed options from current classification cases. |
| `Message` | Long text | `intake_leads.message` | Full inquiry message. |
| `Source URL` | URL | `intake_leads.source_url` | Source page or referer. |
| `UTM Source` | Single line text | `intake_leads.utm_source` | Optional attribution. |
| `UTM Medium` | Single line text | `intake_leads.utm_medium` | Optional attribution. |
| `UTM Campaign` | Single line text | `intake_leads.utm_campaign` | Optional attribution. |
| `Consent` | Checkbox | `intake_leads.consent_checkbox` | Store `1` as checked. |
| `Inquiry Summary` | Long text | `intake_leads.inquiry_summary` | Generated summary. |
| `Lead Score` | Number | `intake_leads.lead_score` | Integer score. |
| `Recommended Next Action` | Long text | `intake_leads.recommended_next_action` | Founder/admin next step. |
| `Deal Type` | Single select | `intake_leads.deal_type` | Seed options from current routing. |
| `Urgency` | Single select | `intake_leads.urgency` | Current default is `standard`. |
| `Estimated Value Range` | Single line text | `intake_leads.estimated_value_range` | Nullable today. |
| `Risk Flags` | Long text | `intake_leads.risk_flags` | Current value is JSON text. |
| `Create Deal Queue Item` | Checkbox | `intake_leads.should_create_deal_queue_item` | Store `1` as checked. |
| `Lead Status` | Single select | `intake_leads.status` | Current initial value is `new`. |
| `Routing Lane` | Single select | `intake_leads.routing_lane` | Operational routing lane. |
| `Routing Destination` | Single line text | `intake_leads.routing_destination` | Human routing destination. |
| `Routing Next Action` | Long text | `intake_leads.routing_next_action` | Routing action copy. |
| `Human Review Path` | Long text | `intake_leads.human_review_path` | Review path before external response. |
| `Routing Outputs JSON` | Long text | `intake_leads.routing_outputs_json` | Full routing payload. |
| `D1 Created At` | Date with time | `intake_leads.created_at` | D1 insert timestamp. |
| `D1 Updated At` | Date with time | `intake_leads.updated_at` | D1 update timestamp. |
| `Sync Queue ID` | Single line text | `lead_sync_queue.id` | Queue correlation ID. |
| `Airtable Sync Status` | Single select | `lead_sync_queue.sync_status` | Mirror queue state for operator view. |
| `Airtable Sync Attempts` | Number | `lead_sync_queue.attempts` | Mirror retry count. |
| `Last Synced At` | Date with time | Sync runtime | Set only after successful Airtable write. |
| `Source System` | Single select | constant | Use `cloudflare_d1`. |
| `Source Service` | Single line text | constant | Use `odb-holdings-site`. |

Required single select options:

- `Inquiry Type`: `Licensing Inquiry`, `Partnership`, `Service Contract Request`, `Operating Systems / Buildout`, `General Inquiry`
- `Deal Type`: `licensing`, `partnership`, `service_contract`, `operating_system_buildout`, `general_inquiry`
- `Urgency`: `standard`
- `Lead Status`: `new`, `reviewing`, `contacted`, `qualified`, `disqualified`, `archived`
- `Routing Lane`: `licensing`, `partnership`, `service_contract`, `operating_system_buildout`, `clarification_triage`
- `Airtable Sync Status`: `pending`, `retry`, `synced`, `failed`
- `Source System`: `cloudflare_d1`

## Required Secrets and Configuration

Secrets:

- `AIRTABLE_API_TOKEN`: Airtable Personal Access Token scoped to the target base. Minimum live-sync scope should allow writing records in the target base. Add read/schema scopes only if the implementation performs schema checks.
- `INTERNAL_SYNC_TOKEN`: random high-entropy bearer token for the internal sync route.

Non-secret Worker variables:

- `AIRTABLE_BASE_ID`: target Airtable base ID.
- `AIRTABLE_LEADS_TABLE_ID`: target Airtable table ID for `Website Inquiry Leads`.
- `AIRTABLE_SYNC_MODE`: default `dry_run`; set to `live` only after owner approval.
- `AIRTABLE_SYNC_LIMIT`: default `1`; hard cap `10` because Airtable batch APIs process up to 10 records per request.

Important deployment boundary:

- Do not run `npx wrangler secret put <KEY>` during this planning slice. That command creates a new Worker version and deploys immediately.
- Add secrets only in an approved implementation/deployment step, or use a non-deploying versioned secret workflow if the release path supports it.

## Smallest Safe Sync Slice

Implement an authenticated manual route first:

`POST /api/internal/airtable/sync-leads`

Why this route first:

- It reuses the existing Worker and D1 binding.
- It can be covered by the existing Node contract test style.
- It avoids surprise background writes.
- It supports one-record canary validation before scheduled sync is enabled.
- It keeps Cloudflare as the execution boundary.

Route behavior:

1. Require `Authorization: Bearer <INTERNAL_SYNC_TOKEN>`.
2. Reject missing Airtable configuration with `500` and no D1 state mutation.
3. Accept optional JSON body:

```json
{
  "dry_run": true,
  "limit": 1
}
```

4. Force `dry_run = true` unless `AIRTABLE_SYNC_MODE = "live"` and request body sets `"dry_run": false`.
5. Query up to `limit` queue rows where `target_system = "airtable"` and `sync_status` is `pending` or eligible `retry`.
6. Join each queue row to `intake_leads`.
7. Map the joined row to Airtable fields.
8. In dry run, return the mapped payload without calling Airtable or mutating queue status.
9. In live mode, call Airtable with an idempotent upsert keyed by `Lead ID`.
10. On success, set `lead_sync_queue.sync_status = "synced"` and insert `airtable_sync_succeeded` into `intake_events`.
11. On retryable failure, increment `attempts`, set `sync_status = "retry"` or `failed` depending on max attempts, and insert an audit event.

Scheduled job is a second slice, not the first slice. After the manual route succeeds with canary records, add a `scheduled(controller, env, ctx)` handler and cron trigger that call the same sync function with a small limit.

## Airtable Write Strategy

Use Airtable Web API upsert rather than blind create.

Recommended request shape for the implementation:

```json
{
  "performUpsert": {
    "fieldsToMergeOn": ["Lead ID"]
  },
  "records": [
    {
      "fields": {
        "Lead ID": "D1 lead UUID",
        "Request ID": "D1 request UUID",
        "Name": "Lead name",
        "Email": "lead@example.com"
      }
    }
  ]
}
```

Use `PATCH https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_LEADS_TABLE_ID}`.

Do not use blind `POST` create for queued leads, because a retry after a partial success can create duplicate Airtable rows.

## Retry Rules

Initial queue state already exists:

- `sync_status = "pending"`
- `attempts = 0`

Proposed retry behavior:

- Success: set `sync_status = "synced"` and do not retry.
- Airtable `429`: set `sync_status = "retry"`, increment `attempts`, log `Retry-After` if present, and do not retry inside the same request.
- Airtable `408`, `409`, and `5xx`: set `sync_status = "retry"`, increment `attempts`, and log the sanitized response.
- Network exception: set `sync_status = "retry"`, increment `attempts`, and log the exception name and message.
- Airtable `400`, `401`, `403`, `404`, and other non-retryable `4xx`: set `sync_status = "failed"` and log the sanitized response. These usually mean bad schema, bad token, bad base/table ID, or bad field mapping.
- Max attempts: after 5 failed attempts, set `sync_status = "failed"`.

Backoff without schema changes:

- Use `lead_sync_queue.updated_at` as the last attempt timestamp.
- Suggested delay by attempts: 1 minute, 5 minutes, 15 minutes, 60 minutes, 360 minutes.
- The manual route can expose skipped rows in its response when a retry row is not yet eligible.

## Failure Logging

Use `intake_events` for durable audit records. Do not store secrets, full tokens, request headers, or unbounded response bodies.

Event types:

- `airtable_sync_started`
- `airtable_sync_succeeded`
- `airtable_sync_retry_scheduled`
- `airtable_sync_failed`
- `airtable_sync_skipped`

Recommended `event_payload` shape:

```json
{
  "queue_id": "lead_sync_queue UUID",
  "target_system": "airtable",
  "attempt": 1,
  "dry_run": false,
  "airtable_base_id": "app...",
  "airtable_table_id": "tbl...",
  "http_status": 429,
  "error_kind": "rate_limited",
  "error_message": "Sanitized and truncated Airtable error message",
  "retry_after_seconds": 30,
  "next_retry_delay_minutes": 5
}
```

Also emit structured Worker logs through `console.log` or `console.error` for Cloudflare observability:

```json
{
  "service": "odb-holdings-site",
  "event": "airtable_sync_failed",
  "lead_id": "D1 lead UUID",
  "queue_id": "lead_sync_queue UUID",
  "attempt": 1,
  "http_status": 429
}
```

## Validation Commands

Run before implementation starts:

```powershell
node --test .\scripts\test_worker_contract.mjs
python .\scripts\validate_site.py
npx wrangler deploy --dry-run --config .\wrangler.jsonc
```

Expected current results:

- Node contract tests pass with the existing inquiry contract.
- Static site validator prints `Holdings site validation passed.`
- Wrangler dry run reports the `DB` and `ASSETS` bindings and exits without deploying.

Add implementation tests before live writes:

- Route rejects missing bearer token with `401`.
- Route rejects wrong bearer token with `401`.
- Route returns dry-run Airtable field mapping without calling `fetch`.
- Route enforces `limit <= 10`.
- Route selects only `target_system = "airtable"` rows.
- Route marks success as `synced` when mocked Airtable returns `200`.
- Route marks retryable failures as `retry` and inserts `airtable_sync_retry_scheduled`.
- Route marks non-retryable failures as `failed` and inserts `airtable_sync_failed`.
- Route does not call Airtable unless `AIRTABLE_SYNC_MODE = "live"` and request body has `"dry_run": false`.

Run after implementation, still before production deploy:

```powershell
node --test .\scripts\test_worker_contract.mjs
python .\scripts\validate_site.py
npx wrangler deploy --dry-run --config .\wrangler.jsonc
```

Run only after owner approval for live Airtable validation:

```powershell
Invoke-RestMethod -Uri https://odb-holdings-site.embranch1993.workers.dev/api/internal/airtable/sync-leads -Method Post -Headers @{ Authorization = "Bearer <INTERNAL_SYNC_TOKEN>" } -ContentType "application/json" -Body '{"dry_run":false,"limit":1}'
npx wrangler d1 execute branchops-intake --remote --command "SELECT id, lead_id, target_system, sync_status, attempts, updated_at FROM lead_sync_queue WHERE target_system = 'airtable' ORDER BY updated_at DESC LIMIT 5;"
npx wrangler d1 execute branchops-intake --remote --command "SELECT id, lead_id, event_type, event_payload, created_at FROM intake_events WHERE event_type LIKE 'airtable_sync_%' ORDER BY created_at DESC LIMIT 5;"
```

## Risks

- Airtable duplicates: use upsert keyed by `Lead ID`; do not use blind create.
- Public internal route: require bearer auth and do not expose route in frontend code.
- Secret deployment side effects: avoid `wrangler secret put` until deployment is approved.
- Schema mismatch: Airtable field names and select options must exist before live writes.
- PII leakage: do not log full messages, tokens, headers, or unrestricted Airtable response bodies.
- Retry loops: never retry `429` or `5xx` repeatedly inside the same request; use queue state and backoff.
- No queue lease columns: keep first slice manual and low-limit to avoid concurrent processors. Add lease fields only in a future D1 migration if scheduled sync creates concurrency pressure.
- Production D1 binding: all remote D1 validation commands touch production; use read-only queries unless an approved canary is underway.

## System Design

The durable system is an owned lead-routing bridge:

- D1 remains the operational record of submitted website inquiries.
- Airtable becomes the execution tracker for founder/admin review and deal routing.
- `intake_events` becomes the audit ledger for sync behavior.
- `lead_sync_queue` remains the integration boundary so future targets such as Notion, email, or CRM can reuse the queue pattern.

This creates a repeatable owned intake pipeline that can be repackaged for other BranchOps sites and client systems.

## Implementation Tasks

### Task 1: Create Airtable Table

**Files:**

- No repo file changes.
- External setup: Airtable base selected by owner.

- [ ] Create Airtable table `Website Inquiry Leads`.
- [ ] Add every field listed in `Required Airtable Fields`.
- [ ] Confirm `Lead ID` is unique for any manual seed records.
- [ ] Copy the base ID and table ID into the implementation handoff notes.

### Task 2: Add Dry-Run Sync Route

**Files:**

- Modify: `src/worker.js`
- Modify: `scripts/test_worker_contract.mjs`

- [ ] Add `POST /api/internal/airtable/sync-leads`.
- [ ] Add bearer-token auth using `INTERNAL_SYNC_TOKEN`.
- [ ] Add D1 query for pending Airtable queue rows joined to leads.
- [ ] Add Airtable field mapping function.
- [ ] Return mapped dry-run payload without mutating queue status.
- [ ] Add contract tests for auth, dry-run mapping, and limit enforcement.
- [ ] Run `node --test .\scripts\test_worker_contract.mjs`.

### Task 3: Add Mocked Live Sync Behavior

**Files:**

- Modify: `src/worker.js`
- Modify: `scripts/test_worker_contract.mjs`

- [ ] Add Airtable API call behind `AIRTABLE_SYNC_MODE = "live"` and request body `"dry_run": false`.
- [ ] Use `PATCH https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_LEADS_TABLE_ID}` with `performUpsert.fieldsToMergeOn = ["Lead ID"]`.
- [ ] Update queue status and insert audit events based on mocked Airtable responses.
- [ ] Add tests for success, retryable failure, non-retryable failure, and no-live-write guard.
- [ ] Run `node --test .\scripts\test_worker_contract.mjs`.

### Task 4: Dry-Run Deployment Check

**Files:**

- Modify only if needed: `wrangler.jsonc`

- [ ] Add non-secret vars only if the implementation uses `vars`.
- [ ] Do not add secret values to `wrangler.jsonc`.
- [ ] Run `python .\scripts\validate_site.py`.
- [ ] Run `npx wrangler deploy --dry-run --config .\wrangler.jsonc`.
- [ ] Do not deploy without explicit owner approval.

### Task 5: Live Canary After Approval

**Files:**

- No repo file changes expected.

- [ ] Add Worker secrets only after deployment approval.
- [ ] Deploy only after explicit approval.
- [ ] Trigger one live sync with `limit = 1`.
- [ ] Confirm Airtable has exactly one row for the D1 `Lead ID`.
- [ ] Confirm D1 queue row is `synced`.
- [ ] Confirm `intake_events` has `airtable_sync_succeeded`.
- [ ] Stop and review before enabling scheduled sync.

## Ship Decision for This Planning Slice

Ship with documented non-blocking issues.

This planning document is safe to commit after review because it changes documentation only and does not perform any Airtable writes, deploys, D1 migrations, or secret changes.

## Asset Registration Notes

- Register as an automation asset: `Cloudflare D1 to Airtable Website Lead Sync`.
- Register source repository: `odb-holdings-site`.
- Register source tables: `intake_leads`, `intake_events`, `lead_sync_queue`.
- Register target Airtable table: `Website Inquiry Leads`.
- Track implementation as an Airtable task before code changes begin.
- Publish human-readable SOP to Notion after the first live canary succeeds.

## Monetization / Scaling Path

This pattern can become a reusable BranchOps intake package:

- Website inquiry capture on Cloudflare Workers and D1.
- Queue-based sync to Airtable operations.
- Audit trail in D1.
- Optional Notion SOP export.
- Optional licensing package for client intake systems, founder dashboards, and small-business lead routing.

## Next Implementation Prompt

```text
You are working in the odb-holdings-site repo.

Objective:
Implement the first safe Airtable lead sync slice for website inquiry leads queued in Cloudflare D1.

Rules:
- Do not deploy.
- Do not commit unless I confirm.
- Do not write live Airtable records unless I explicitly approve a canary.
- Do not change production D1 schema.
- Keep Cloudflare Workers and D1 as the execution boundary.

Use docs/AIRTABLE_LEAD_SYNC_PLAN.md as the governing plan.

Tasks:
1. Modify src/worker.js to add POST /api/internal/airtable/sync-leads.
2. Require Authorization: Bearer <INTERNAL_SYNC_TOKEN>.
3. Implement dry-run mapping from lead_sync_queue + intake_leads to Airtable fields.
4. Keep dry_run true unless AIRTABLE_SYNC_MODE is live and request body sets dry_run false.
5. Add mocked Airtable write behavior using PATCH with performUpsert keyed by Lead ID.
6. Update lead_sync_queue and intake_events for mocked success, retry, and failure paths.
7. Extend scripts/test_worker_contract.mjs for auth, dry-run, no-live-write guard, success, retry, and failure.
8. Run node --test .\scripts\test_worker_contract.mjs.
9. Run python .\scripts\validate_site.py.
10. Run npx wrangler deploy --dry-run --config .\wrangler.jsonc.

Return files changed, validation output, risks, and whether safe to commit.
```

## References

- Cloudflare Workers scheduled handlers: https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- Cloudflare D1 prepared statements: https://developers.cloudflare.com/d1/worker-api/prepared-statements/
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Airtable Web API getting started: https://support.airtable.com/docs/getting-started-with-airtables-web-api
- Airtable API limits and batching: https://support.airtable.com/docs/managing-api-call-limits-in-airtable
