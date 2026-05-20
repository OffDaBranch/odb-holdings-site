# Deployment

## Local Setup

```bash
npm install
npm run build
npm run test
npm run dev
```

## D1 Setup

Create the production database:

```bash
wrangler d1 create branchops-intake
```

Create the preview database if preview deploys should use a separate store:

```bash
wrangler d1 create branchops-intake-preview
```

Replace the placeholder `database_id` values in `wrangler.jsonc`, then apply migrations:

```bash
wrangler d1 migrations apply branchops-intake --remote
wrangler d1 migrations apply branchops-intake-preview --remote --env preview
```

## Secrets

```bash
wrangler secret put ADMIN_BEARER_TOKEN
wrangler secret put OPENAI_API_KEY
```

`OPENAI_API_KEY` is optional. If it is not set or the AI request fails, the rule-based classifier is used.

## Validation

```bash
npm run build
npm run test
wrangler deploy --dry-run
```

## Production Deploy

```bash
wrangler deploy
```
