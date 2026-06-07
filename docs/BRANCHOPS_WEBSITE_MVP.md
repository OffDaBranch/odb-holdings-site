# BranchOps Website MVP Execution Brief

## Control Status

Status: Draft / Needs Validation
Owner: Branch Off Holdings
Repo: OffDaBranch/odb-holdings-site
Branch: branchops-website-mvp

This document scopes the BranchOps website as a public trust-building front door connected to a private founder operating layer. It is not final company truth until the related Airtable records, Notion SOPs, GitHub issues, deployment proof, privacy language, and validation evidence are reconciled.

## Objective

Build BranchOps into a public website and intake-driven operating system that helps founders, workers, students, and small businesses structure, document, verify, and grow real operations without overclaiming certification, funding, compliance, AI, Web3, GPS, or surveillance capabilities.

Plain-language positioning:

> BranchOps helps people stop moving off memory, scattered notes, and random advice. It gives them a system to organize the business, prove the work, protect the assets, and grow the right way.

## Product Classification

- Infrastructure
- Product
- Automation
- Verification
- Revenue Asset
- Education Platform

## Phase 1 MVP Scope

Phase 1 should prove the concept through public education, structured intake, internal review, scoring, and lead conversion.

### Required Public Routes

| Route | Purpose |
| --- | --- |
| `/` | Main public front door and trust-building homepage |
| `/how-it-works` | Explains the BranchOps process in plain language |
| `/intake` | Founder/business/student intake form |
| `/programs` | Pilot, cohort, education, and Green3 pathways |
| `/verification` | Explains proof, review, verification statuses, and limits |
| `/community-impact` | Founder readiness, workforce readiness, and future impact tracking |
| `/resources` | Free checklists, guides, and readiness tools |
| `/admin/leads-dashboard` | Private review dashboard for intakes and CSV export |

### Build Now

- Public BranchOps-first homepage or dedicated BranchOps route
- Founder/business/student intake form
- Intake classification and routing
- Practical readiness score
- Admin review dashboard
- CSV export
- Intake event logging
- Safe privacy, verification, and funding-readiness language
- Mailchimp or downstream follow-up path, if configured
- Airtable visibility mirror, if configured

### Defer Until Validated

- Public registry
- Login system
- Certificate issuance
- Payment system
- Web3 proof
- GPS/worksite proof
- Drone/satellite workflows
- Automated legal or compliance determinations
- Public display of private founder data

## Public Homepage Requirements

The homepage should answer five questions quickly:

1. What is BranchOps?
2. Who is it for?
3. What problem does it solve?
4. How does it work?
5. How do I start?

### Hero Copy

Headline:

> Build your business with structure, proof, and control.

Subheadline:

> BranchOps helps founders, workers, students, and small businesses organize ideas, document progress, verify important steps, and turn work into scalable assets.

Primary CTA:

> Start Founder Intake

Secondary CTA:

> See How BranchOps Works

## Core Process

| Stage | Name | What Happens |
| --- | --- | --- |
| 1 | Intake | Founder submits idea, business, skill, or asset |
| 2 | Classification | BranchOps classifies it as product, service, IP, asset, education, licensing, or another lane |
| 3 | Structure | System identifies entity, ownership, workflow, and documentation questions |
| 4 | Proof | User submits documents, notes, links, photos, receipts, contracts, or completion records |
| 5 | Readiness Score | BranchOps gives a practical score and missing-item list |
| 6 | Action Plan | User receives next recommended steps |
| 7 | Verification Review | Higher-risk items require founder/admin/third-party review |
| 8 | Registry Status | Approved businesses/assets may later receive public or private verification status |

## Intake Categories

| Category | Example Fields |
| --- | --- |
| Founder Info | Name, email, phone, location, role |
| Business Status | Idea, side hustle, active business, nonprofit, student project |
| Business Type | Service, product, education, apparel, real estate, digital asset, content |
| Current Setup | Entity, EIN, bank account, website, licenses, insurance |
| Assets | Domains, brand names, social handles, equipment, vehicles, IP |
| Revenue | Pre-revenue, active revenue, grants, contracts, recurring revenue |
| Risk | Legal, safety, payments, children, food, labor, regulated activity |
| Proof | Documents, screenshots, photos, receipts, contracts |
| Goals | Funding, structure, launch, verification, training, licensing |

## Readiness Score Model

The score must be practical, transparent, and non-certification language.

| Category | Weight |
| --- | ---: |
| Business Clarity | 15% |
| Ownership/IP Control | 15% |
| Legal/Compliance Readiness | 20% |
| Proof Documentation | 20% |
| Revenue/Offer Readiness | 15% |
| Operations/SOP Readiness | 10% |
| Risk Management | 5% |

Example output:

> Your score is 62/100. You are not ready for public verification yet. Complete your business file, proof folder, and compliance review to move forward.

## Verification Status Model

| Status | Meaning |
| --- | --- |
| Intake Started | Basic info submitted |
| Profile Complete | Core info is filled out |
| Proof In Progress | Evidence is being collected |
| Admin Review Needed | Human review required |
| Conditional | Some steps complete, gaps remain |
| Verified Internal | Approved privately |
| Verified Public | Eligible for public registry |
| Expired / Needs Update | Proof is outdated |
| Not Approved | Failed required review |

## Required Trust Language

Use this on the verification page:

> BranchOps verification is not surveillance. It is a structured proof process that helps founders and organizations document important business steps, work completion, training progress, and readiness records. Higher-level verification is only used when someone chooses to pursue verified status, funding readiness, certificates, registry placement, licensing, or high-risk approval.

## Safety Rules For Public Copy

Do not claim that BranchOps:

- legally certifies businesses
- has government approval
- guarantees grants or funding
- guarantees business success
- provides legal, tax, or accounting advice
- tracks people by default
- issues certificates at signup
- has active Web3, GPS, drone, or satellite verification unless deployed and validated

Use language such as:

- guidance
- readiness
- proof review
- recommended path
- advisor review recommended
- public certificates are not issued at signup
- higher-level verification is optional and evidence-based

## Source-of-Truth Routing

| System | Role |
| --- | --- |
| GitHub | Code, schemas, issues, versioned docs, validation logic |
| Cloudflare | Hosting, Workers, D1, static assets, future R2 storage |
| Airtable | Structured operations visibility and lead/admin review mirror |
| Notion | SOPs, manuals, training content, founder guides |
| Mailchimp | Intake follow-up, pilot nurture, founder education emails |

BranchOps should remain first-party source of truth for owned intake data. Airtable and notification systems should be downstream mirrors, not the primary source of record.

## Phase 1 Acceptance Criteria

Do not call this an Operational MVP until proof exists that:

- Public BranchOps route/page exists
- Intake submission works
- Record is stored in D1 or BranchOps-controlled storage
- Admin can view submitted leads
- CSV export works
- Basic classification runs
- Readiness scoring exists
- Event/audit logging exists
- Privacy and verification disclaimers exist
- Public copy avoids certification/funding/compliance overclaims
- Deployment proof exists
- Tests or validation checks pass

## Next Build Order

1. Add BranchOps-first public route and homepage sections.
2. Expand intake schema to founder/business/student readiness categories.
3. Add readiness scoring fields and status model.
4. Add verification page copy and disclaimers.
5. Add programs, community impact, and resources pages.
6. Update admin dashboard to show readiness, risk flags, status, and next action.
7. Add D1 migration changes for business file and readiness fields.
8. Add validation tests for required routes, intake, scoring, and CSV export.
9. Prepare deployment checklist and preview validation.

## Founder Approval Gates

Founder approval is required before:

- publishing public verification claims
- issuing certificates
- showing registry profiles publicly
- collecting sensitive proof documents
- launching paid memberships or review fees
- making funding/certification promises
- connecting youth/student programs that may involve minors
- representing any status as government-approved, legally certified, or professionally reviewed
