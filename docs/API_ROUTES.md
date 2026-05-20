# API Routes

All JSON responses include `request_id`. Errors use:

```json
{
  "ok": false,
  "request_id": "req_...",
  "error": {
    "code": "validation_error",
    "message": "Intake submission is invalid.",
    "details": ["email must be valid"]
  }
}
```

## `POST /api/intake`

Creates a new lead.

Alias retained for the existing frontend path:

- `POST /api/public/intake/contact`

## `GET /api/admin/leads`

Returns recent leads. Requires:

```text
Authorization: Bearer <ADMIN_BEARER_TOKEN>
```

## `GET /api/admin/export.csv`

Exports recent leads as CSV. Requires the same bearer token.

## Secrets

Set secrets with Wrangler:

```bash
wrangler secret put ADMIN_BEARER_TOKEN
wrangler secret put OPENAI_API_KEY
```

`OPENAI_MODEL` can be configured as a non-secret variable if needed.
