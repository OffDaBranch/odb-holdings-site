# Website Inquiry Intake Backend Validation

## Objective

Complete and validate the Branch Off Holdings website inquiry intake backend on Cloudflare Workers with D1 persistence, while preserving the static site and leaving Airtable and Notion as follow-up systems.

## Files Changed

- `src/worker.js`
- `wrangler.jsonc`
- `index.html`
- `public/index.html`
- `scripts/test_worker_contract.mjs`
- `docs/WEBSITE_INQUIRY_INTAKE_BACKEND_VALIDATION.md`

## Cloudflare Worker URL

https://odb-holdings-site.embranch1993.workers.dev

## D1 Database

- Name: `branchops-intake`
- Binding: `DB`
- Database ID: `7d297639-856c-4a14-b2c8-f6ca980a1334`

## Endpoint List

- `GET /api/health`
- `POST /api/inquiries`
- `OPTIONS *`
- Static asset fallback through `env.ASSETS.fetch(request)`

## Validation Commands

```powershell
node --test .\scripts\test_worker_contract.mjs
python .\scripts\validate_site.py
npx wrangler deploy --dry-run --config .\wrangler.jsonc
npx wrangler deploy --config .\wrangler.jsonc
Invoke-RestMethod -Uri https://odb-holdings-site.embranch1993.workers.dev/api/health -Method Get
Invoke-RestMethod -Uri https://odb-holdings-site.embranch1993.workers.dev/api/inquiries -Method Post -ContentType 'application/json' -Body $body
npx wrangler d1 execute branchops-intake --remote --command "SELECT id, request_id, name, email, inquiry_type, status, should_create_deal_queue_item, routing_lane, created_at FROM intake_leads ORDER BY created_at DESC LIMIT 5;"
npx wrangler d1 execute branchops-intake --remote --command "SELECT id, lead_id, target_system, sync_status, attempts, created_at FROM lead_sync_queue ORDER BY created_at DESC LIMIT 5;"
npx wrangler d1 execute branchops-intake --remote --command "SELECT id, lead_id, event_type, created_at FROM intake_events ORDER BY created_at DESC LIMIT 5;"
```

## Validation Results

### Local Contract Test

Result: Pass

```text
tests 3
pass 3
fail 0
```

### Static Site Validator

Result: Pass

```text
Holdings site validation passed.
```

### Wrangler Dry Run

Result: Pass

```text
Binding                            Resource
env.DB (branchops-intake)          D1 Database
env.ASSETS                         Assets
--dry-run: exiting now.
```

### Deployment

Result: Pass

```text
Deployed odb-holdings-site triggers
https://odb-holdings-site.embranch1993.workers.dev
Current Version ID: ec881dcc-bc40-45bc-96f1-6ad656063995
```

### Live Health Check

Result: Pass

```json
{
  "ok": true,
  "service": "odb-holdings-site",
  "db_bound": true,
  "assets_bound": true
}
```

### Live Inquiry POST

Result: Pass

```json
{
  "ok": true,
  "request_id": "5da1bee2-ee4c-4774-9251-afa11f902331",
  "lead_id": "b6087456-88c6-4ff4-aa1f-f721fbf6a8fa",
  "status": "new",
  "next_action": "Review licensing fit and prepare discovery response."
}
```

### D1 Lead Proof

Result: Pass

```json
{
  "id": "b6087456-88c6-4ff4-aa1f-f721fbf6a8fa",
  "request_id": "5da1bee2-ee4c-4774-9251-afa11f902331",
  "name": "Live Validation Lead",
  "email": "validation+odb-holdings-site@example.com",
  "inquiry_type": "Licensing Inquiry",
  "status": "new",
  "should_create_deal_queue_item": 1,
  "routing_lane": "licensing",
  "created_at": "2026-05-28T17:47:46.255Z"
}
```

### D1 Sync Queue Proof

Result: Pass

```json
{
  "id": "78882946-676c-426d-9735-fb1b269297f6",
  "lead_id": "b6087456-88c6-4ff4-aa1f-f721fbf6a8fa",
  "target_system": "airtable",
  "sync_status": "pending",
  "attempts": 0,
  "created_at": "2026-05-28T17:47:46.255Z"
}
```

### D1 Event Proof

Result: Pass

```json
{
  "id": "4e56fb27-4161-4e48-a460-0d5645d39a9b",
  "lead_id": "b6087456-88c6-4ff4-aa1f-f721fbf6a8fa",
  "event_type": "inquiry_submitted",
  "created_at": "2026-05-28T17:47:46.255Z"
}
```

## Current Status

The website inquiry intake backend is deployed and live. A terminal POST request successfully created the lead record, audit event, and pending Airtable sync queue item in the production D1 database.

## Remaining Work

- Airtable sync worker/export
- Notion SOP registration
- Custom domain route
- Spam/rate limiting
- Notification email or dashboard
