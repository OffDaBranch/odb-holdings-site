# Asset Registration

## Asset Registry Record

Name: Branch Off Holdings Website Inquiry Intake System

Classification: Website-integrated SaaS module

Owner: Branch Off Holdings

Repository: `OffDaBranch/odb-holdings-site`

Status: MVP build

Revenue potential:

- Setup fees
- Retainers
- SaaS licensing
- White-label licensing
- Consulting upsell

## Build Queue Record

Title: Add BranchOps Intake OS to branchoffholdings.com

Outcome: Add structured intake, D1 persistence, AI classification, admin review, CSV export, and sync stubs without creating a separate SaaS repo.

## Cloudflare Worker Deployment Record

Record type: Infrastructure deployment control record

Worker: `odb-holdings-site`

Repository: `OffDaBranch/odb-holdings-site`

Production branch: `main`

Deploy command: `npm run deploy:production`

Preview deploy command: `npm run deploy:preview`

Required production environment: top-level/default Wrangler configuration unless a formal `env.production` block is added later

D1 binding: `DB`

Production D1 database name: `branchops-intake`

Preview D1 database name: `branchops-intake-preview`

Migrations directory: `./migrations`

Recovery owner: Branch Off Holdings founder/operator

Internal-only fields:

- Cloudflare account ID
- Production D1 database ID
- Preview D1 database ID
- Admin bearer token owner
- OpenAI API key owner, if used
- Cloudflare login recovery path
- D1 backup/export location
- Last successful deployment timestamp
- Last migration timestamp

## Digital Asset Register Entry

Asset category: Digital infrastructure / Cloudflare Worker / D1 database

Asset name: `odb-holdings-site` Worker + `branchops-intake` D1 database

Control purpose:

- Public website routing
- Structured inquiry intake
- Lead persistence
- Admin lead review
- CSV export
- Future Airtable/Notion sync queue processing

Required linked systems:

- Cloudflare account
- GitHub repository
- Wrangler configuration
- D1 production database
- D1 preview database, if used
- Airtable infrastructure incident record
- Notion deployment SOP
- Company digital vault or password manager

Governance rule:

The Worker, D1 databases, source repository, deployment procedure, secrets, and recovery path must be tracked as company digital assets. Public repository documentation may identify the asset and required controls, but must not expose account IDs, D1 database IDs, bearer tokens, API keys, recovery credentials, or private operational notes.

## Incident Record Template

Title: Cloudflare deploy blocked by invalid D1 database ID

Severity: High

System: `odb-holdings-site`

Failure point: Wrangler deployment

Root cause: `DB` binding referenced placeholder D1 `database_id`

Corrective action:

1. Run `npx wrangler d1 list` under the correct Cloudflare account.
2. Copy the real ID for `branchops-intake`.
3. Replace the all-zero placeholder in `wrangler.jsonc`.
4. Run `npm run check:d1-bindings`.
5. Run `npm run build` and `npm run test`.
6. Redeploy with `npm run deploy:production`.
7. Update Airtable and Notion records with the corrected internal deployment inventory.
