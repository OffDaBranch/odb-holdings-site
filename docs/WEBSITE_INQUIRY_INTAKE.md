# Branch Off Holdings Website Inquiry Intake

## Purpose

The website intake system turns branchoffholdings.com into the controlled front door for deal flow, licensing interest, systems/buildout requests, education inquiries, contractor/property service leads, media, AI automation, and investment/acquisition conversations.

## Public Flow

1. Visitor submits `/contact`.
2. Browser sends structured JSON to `POST /api/intake`.
3. Worker validates required fields and consent.
4. Worker classifies the lead with the configured AI adapter or the rule-based fallback.
5. Lead, event, and sync queue rows are stored in D1.
6. Admin reviews `/admin/leads-dashboard` with a bearer token.
7. Admin exports CSV or later pushes records to Airtable/Notion.

## Required Fields

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
- `submitted_at`
- `consent_checkbox`

## Human Review Rule

AI-assisted scoring is routing support only. It does not guarantee funding, licensing approval, deal acceptance, or any specific outcome.
