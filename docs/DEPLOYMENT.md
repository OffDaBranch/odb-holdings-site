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
- Do not store Cloudflare account IDs, bearer tokens, API keys, or recovery credentials in public documentation.
- Store sensitive deployment inventory in Airtable, Notion, or the internal company vault.

## Public Repository Exposure Rule

`OffDaBranch/odb-holdings-site` is currently a public repository. If real D1 `database_id` values are committed into `wrangler.jsonc`, those IDs become public repository data.

Selected control: option 3. This public repository keeps all-zero placeholders in the tracked
`wrangler.jsonc` template. Deployment generates root-level `wrangler.generated.jsonc`
from protected environment values; that file is ignored by git and remains beside the template
so Wrangler resolves relative source and asset paths correctly. Do not commit the generated
file or paste its IDs into issues, PRs, Airtable/Notion public views, or public documentation.

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

Store the database IDs as protected CI/environment values, not tracked files:

| Protected value | D1 database |
| --- | --- |
| `D1_PRODUCTION_DATABASE_ID` | `branchops-intake` |
| `D1_PREVIEW_DATABASE_ID` | `branchops-intake-preview` |

`npm run generate:deploy-config` requires both values, validates their UUID format, and creates
the ignored deploy-only Wrangler config. The generator does not print the injected values.

## D1 Binding Validation

The tracked public template must fail this check while it holds placeholders:

```bash
npm run check:d1-bindings
```

For a controlled deployment session after protected values are supplied, validate the generated
configuration explicitly:

```bash
npm run generate:deploy-config
npm run check:d1-bindings -- --config wrangler.generated.jsonc
```

The check examines every configured D1 binding in the selected config and fails if:

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

Use these commands in this order. `npx wrangler d1 list` requires authenticated Cloudflare access
and is used only to populate the protected values. In a public checkout,
`npm run check:d1-bindings` is expected to fail on the tracked placeholder template; this is the
repository leak-prevention guard. `deploy:dry-run` and `deploy:production` generate and validate
the ignored configuration and require both protected values to be present.

```bash
npx wrangler d1 list
npm run check:d1-bindings
npm run build
npm run test
npm run deploy:dry-run
npm run deploy:production
```

Do not run `npm run deploy:production` as a validation-only step unless a production deployment
is authorized. It performs the production deploy after generation and validation.

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
npm run generate:deploy-config
npm run check:d1-bindings -- --config wrangler.generated.jsonc
npx wrangler deploy --config wrangler.generated.jsonc --env ""
```

Do not add `--env preview` for production. Add a formal `env.production` block only if the
repository intentionally switches to environment-scoped production configuration, and extend the
generator mapping before doing so.

## Incident Recovery Procedure

If Cloudflare reports a D1 binding failure:

1. Stop redeploy attempts.
2. Run `npx wrangler d1 list` locally under the correct Cloudflare account.
3. Confirm the target database name: `branchops-intake` for production or `branchops-intake-preview` for preview.
4. Use the selected protected-value generated-config control for D1 ID handling.
5. Correct `D1_PRODUCTION_DATABASE_ID` or `D1_PREVIEW_DATABASE_ID` in the protected environment.
6. Run `npm run generate:deploy-config` and `npm run check:d1-bindings -- --config wrangler.generated.jsonc`.
7. Run `npm run build` and `npm run test`.
8. Apply migrations if the database is new or schema changed.
9. Deploy with the correct command.
10. Log the incident and corrected deployment record in Airtable and Notion.
