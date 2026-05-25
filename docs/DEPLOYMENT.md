# Deployment

## Local Setup

```bash
npm install
npm run build
npm run test
npm run dev
```

## Deployment-Control Decision

This Worker uses Cloudflare D1 through the `DB` binding. Deployment must not proceed while any D1 `database_id` in `wrangler.jsonc` is still set to the all-zero placeholder.

Required control rule:

- Production deploys use the top-level Wrangler configuration unless a dedicated `production` environment is added later.
- Preview deploys use `--env preview` and must have a separate preview D1 database ID.
- Do not store Cloudflare account IDs, production database IDs, bearer tokens, or recovery credentials in public documentation.
- Store sensitive deployment inventory in Airtable, Notion, or the internal company vault.

## D1 Setup

List existing Cloudflare D1 databases:

```bash
npx wrangler d1 list
```

Create the production database only if it does not already exist:

```bash
npx wrangler d1 create branchops-intake
```

Create the preview database only if preview deploys should use a separate store and it does not already exist:

```bash
npx wrangler d1 create branchops-intake-preview
```

Update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "branchops-intake",
    "database_id": "REAL_PRODUCTION_D1_DATABASE_ID",
    "migrations_dir": "./migrations"
  }
]
```

For preview:

```jsonc
"env": {
  "preview": {
    "workers_dev": true,
    "name": "odb-holdings-site-preview",
    "d1_databases": [
      {
        "binding": "DB",
        "database_name": "branchops-intake-preview",
        "database_id": "REAL_PREVIEW_D1_DATABASE_ID",
        "migrations_dir": "./migrations"
      }
    ]
  }
}
```

## D1 Binding Validation

Before every deploy, run:

```bash
npm run check:d1-bindings
```

This checks every configured D1 binding and fails if:

- `database_id` is missing.
- `database_id` is the all-zero placeholder.
- `database_id` is a textual placeholder.
- `database_id` is not UUID-formatted.

## Migrations

Apply production migrations:

```bash
npx wrangler d1 migrations apply branchops-intake --remote
```

Apply preview migrations:

```bash
npx wrangler d1 migrations apply branchops-intake-preview --remote --env preview
```

## Secrets

```bash
npx wrangler secret put ADMIN_BEARER_TOKEN
npx wrangler secret put OPENAI_API_KEY
```

`OPENAI_API_KEY` is optional. If it is not set or the AI request fails, the rule-based classifier is used.

## Validation

```bash
npm run build
npm run test
npm run deploy:dry-run
```

## Preview Deploy

```bash
npm run deploy:preview
```

## Production Deploy

```bash
npm run deploy:production
```

Production deploy currently maps to:

```bash
npx wrangler deploy
```

Do not add `--env preview` for production. Add a formal `env.production` block only if the repository intentionally switches to environment-scoped production configuration.

## Incident Recovery Procedure

If Cloudflare reports a D1 binding failure:

1. Stop redeploy attempts.
2. Run `npx wrangler d1 list` locally under the correct Cloudflare account.
3. Confirm the target database name: `branchops-intake` for production or `branchops-intake-preview` for preview.
4. Replace the placeholder `database_id` in `wrangler.jsonc`.
5. Run `npm run check:d1-bindings`.
6. Run `npm run build` and `npm run test`.
7. Apply migrations if the database is new or schema changed.
8. Deploy with the correct command.
9. Log the incident and corrected deployment record in Airtable and Notion.
