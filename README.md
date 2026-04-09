# Branch Off Holdings Site

## Objective

Maintain a clean public-facing corporate site for Branch Off Holdings without placeholder pages or mixed internal materials.

## System Design

- `index.html`: single-page corporate holdings site
- `wrangler.jsonc`: Cloudflare Workers static asset deployment configuration
- `scripts/validate_site.py`: repository validation for required metadata and no dead placeholders
- `.github/workflows/validate-site.yml`: CI guardrail for every push and pull request

## Execution Steps

1. Edit `index.html` for public corporate messaging only.
2. Keep deployment configuration in `wrangler.jsonc`.
3. Run `python scripts/validate_site.py` before committing.
4. Deploy through the existing Cloudflare workflow after validation passes.

## Risks

- Do not add internal product code, private operations material, or empty placeholder pages.
- If the site expands to multiple pages later, add real content and update the validator instead of reintroducing empty files.

## Optimization

- One page keeps the holdings narrative clear and easier to maintain.
- The validator prevents silent regressions back into placeholder sprawl.
