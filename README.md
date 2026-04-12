# Branch Off Holdings Site

## Objective

Maintain a modular public-facing holdings site for Branch Off Holdings with a clean homepage, dedicated detail pages, and controlled routing for partnerships, licensing, assets, and company positioning.

## System Design

- `public/index.html`: homepage front door with summary content and route-level calls to action
- `public/about/index.html`: holdco story, structure, and ownership philosophy
- `public/companies/index.html`: portfolio view for public companies, brands, and business lanes
- `public/assets/index.html`: assets, project proof, and portfolio signals
- `public/licensing/index.html`: rights-based commercial lane and deal structure overview
- `public/contact/index.html`: inbound inquiry routing for partnerships, licensing, consulting, media, and general requests
- `public/privacy/index.html`: inquiry privacy notice
- `public/styles.css`: shared visual system across every route
- `public/site.js`: shared mobile navigation, reveal behavior, and contact form submission logic
- `public/404.html`: custom not-found page for Cloudflare static asset routing
- `wrangler.jsonc`: Cloudflare Workers static asset deployment configuration with an isolated public asset directory
- `scripts/validate_site.py`: repository validation for route coverage, shared assets, and deployment-critical metadata
- `.github/workflows/validate-site.yml`: CI guardrail for every push and pull request

## Execution Steps

1. Edit the route that owns the content you want to change under `public/` instead of expanding the homepage.
2. Keep shared styling in `public/styles.css` and shared behavior in `public/site.js`.
3. Keep deployment configuration in `wrangler.jsonc`.
4. Run `python scripts/validate_site.py` before committing.
5. Deploy through the existing Cloudflare workflow after validation passes.

## Risks

- Do not add internal product code, private operations material, or entity claims that are not public-ready.
- Do not collapse route-specific content back onto the homepage.
- If the site expands further, add real page content and extend the validator instead of creating empty placeholder routes.

## Optimization

- Route-based structure gives the holdings model room to scale into deeper company, asset, or licensing pages without redesigning the site again.
- Shared CSS and JS keep the static site maintainable without adding framework dependencies.
- Cloudflare clean URL handling lets directory routes behave like `/about`, `/companies`, `/assets`, `/licensing`, and `/contact` while keeping repo internals outside the public asset surface.
- The validator prevents regressions back into a long mixed homepage or placeholder sprawl.
