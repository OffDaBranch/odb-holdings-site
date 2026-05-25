from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
WRANGLER = ROOT / "wrangler.jsonc"

REQUIRED_PATHS = [
    PUBLIC / "index.html",
    PUBLIC / "styles.css",
    PUBLIC / "site.js",
    PUBLIC / "404.html",
    PUBLIC / "about" / "index.html",
    PUBLIC / "companies" / "index.html",
    PUBLIC / "companies" / "branchops" / "index.html",
    PUBLIC / "companies" / "trapcotton" / "index.html",
    PUBLIC / "assets" / "index.html",
    PUBLIC / "assets" / "brand-assets" / "index.html",
    PUBLIC / "assets" / "operating-systems" / "index.html",
    PUBLIC / "assets" / "digital-property" / "index.html",
    PUBLIC / "licensing" / "index.html",
    PUBLIC / "contact" / "index.html",
    PUBLIC / "admin" / "leads-dashboard" / "index.html",
    PUBLIC / "admin" / "leads-dashboard.js",
    PUBLIC / "privacy" / "index.html",
    ROOT / "src" / "features" / "intake" / "intake.schema.ts",
    ROOT / "src" / "features" / "intake" / "intake.routes.ts",
    ROOT / "src" / "features" / "intake" / "intake.service.ts",
    ROOT / "src" / "features" / "intake" / "intake.ai.ts",
    ROOT / "src" / "features" / "intake" / "intake.types.ts",
    ROOT / "src" / "features" / "intake" / "intake.sync.ts",
    ROOT / "workers" / "intake-api" / "index.ts",
    ROOT / "migrations" / "0001_create_intake_tables.sql",
    ROOT / "docs" / "WEBSITE_INQUIRY_INTAKE.md",
    ROOT / "docs" / "INTAKE_OS_PRODUCT_SPEC.md",
    ROOT / "docs" / "DATABASE_SCHEMA.md",
    ROOT / "docs" / "API_ROUTES.md",
    ROOT / "docs" / "ASSET_REGISTRATION.md",
    ROOT / "docs" / "DEPLOYMENT.md",
    ROOT / "tests" / "intake.test.ts",
]

PAGE_EXPECTATIONS = {
    PUBLIC / "index.html": [
        "Founder-led holding company",
        'href="/about"',
        'href="/companies"',
        'href="/assets"',
        'href="/licensing"',
        'href="/contact"',
        'href="/companies/branchops"',
        'href="/companies/trapcotton"',
        'href="/assets/digital-property"',
    ],
    PUBLIC / "about" / "index.html": [
        "HoldCo Model",
        "Ownership Philosophy",
    ],
    PUBLIC / "companies" / "index.html": [
        "Companies And Brands",
        "Current Portfolio Map",
        'href="/companies/branchops"',
        'href="/companies/trapcotton"',
    ],
    PUBLIC / "companies" / "branchops" / "index.html": [
        "BranchOps",
        "Operating Scope",
        'href="/assets/operating-systems"',
    ],
    PUBLIC / "companies" / "trapcotton" / "index.html": [
        "TrapCotton",
        "Brand System",
        'href="/licensing"',
    ],
    PUBLIC / "assets" / "index.html": [
        "Assets And Projects",
        "Asset Classes",
        'href="/assets/brand-assets"',
        'href="/assets/operating-systems"',
        'href="/assets/digital-property"',
    ],
    PUBLIC / "assets" / "brand-assets" / "index.html": [
        "Brand Assets",
        "TrapCotton",
        'href="/companies/trapcotton"',
    ],
    PUBLIC / "assets" / "operating-systems" / "index.html": [
        "Operating Systems",
        "BranchOps",
        'href="/companies/branchops"',
    ],
    PUBLIC / "assets" / "digital-property" / "index.html": [
        "Digital Property",
        "Controlled Surfaces",
        'href="/contact"',
    ],
    PUBLIC / "licensing" / "index.html": [
        "Licensing And IP",
        "What Can Be Licensed",
    ],
    PUBLIC / "contact" / "index.html": [
        'data-contact-form',
        "Partnerships",
        "Licensing",
        "Grant / Vendor Readiness",
        "consent_checkbox",
    ],
    PUBLIC / "admin" / "leads-dashboard" / "index.html": [
        "Lead intake dashboard.",
        "data-admin-auth",
        "data-export-csv",
    ],
    PUBLIC / "privacy" / "index.html": [
        "How inquiry data is handled.",
        "Human review",
        "admin@branchoffholdings.com",
    ],
    PUBLIC / "404.html": [
        "The page you requested is not available.",
        'href="/"',
    ],
}

SHARED_HTML_SNIPPETS = [
    "Branch Off Holdings",
    '<nav class="header-links"',
    '<footer class="site-footer">',
    'rel="canonical"',
]

FORBIDDEN_PATHS = [
    "agriculture.html",
    "automation.html",
    "data-room.html",
    "digital-assets.html",
    "ip-licensing.html",
    "partner-intake.html",
    "privacy.html",
    "property-services.html",
    "workforce.html",
]

ALLOWED_TOP_LEVEL = {
    ".gitignore",
    "AGENTS.md",
    "README.md",
    "docs",
    "migrations",
    "node_modules",
    "package.json",
    "package-lock.json",
    "public",
    "scripts",
    "src",
    "tests",
    "tsconfig.json",
    "vitest.config.ts",
    "workers",
    "wrangler.jsonc",
}


def main() -> int:
    errors: list[str] = []

    for path in REQUIRED_PATHS:
        if not path.exists():
            errors.append(f"Required path is missing: {path.relative_to(ROOT)}")

    for path, snippets in PAGE_EXPECTATIONS.items():
        if not path.exists():
            continue

        html = path.read_text(encoding="utf-8")
        for snippet in SHARED_HTML_SNIPPETS:
            if snippet not in html:
                errors.append(f"{path.relative_to(ROOT)} must contain {snippet!r}.")

        for snippet in snippets:
            if snippet not in html:
                errors.append(f"{path.relative_to(ROOT)} must contain {snippet!r}.")

    styles = PUBLIC / "styles.css"
    if styles.exists():
        css = styles.read_text(encoding="utf-8")
        for snippet in [":root", ".site-header", ".page-hero", ".contact-form"]:
            if snippet not in css:
                errors.append(f"public/styles.css must contain {snippet!r}.")

    script = PUBLIC / "site.js"
    if script.exists():
        js = script.read_text(encoding="utf-8")
        for snippet in ['"/api/intake"', "data-contact-form", "IntersectionObserver", "consent_checkbox"]:
            if snippet not in js:
                errors.append(f"public/site.js must contain {snippet!r}.")

    admin_script = PUBLIC / "admin" / "leads-dashboard.js"
    if admin_script.exists():
        js = admin_script.read_text(encoding="utf-8")
        for snippet in ["/api/admin/leads", "/api/admin/export.csv", "textContent"]:
            if snippet not in js:
                errors.append(f"public/admin/leads-dashboard.js must contain {snippet!r}.")

    if not WRANGLER.exists():
        errors.append("wrangler.jsonc is missing.")
    else:
        wrangler = WRANGLER.read_text(encoding="utf-8")
        for snippet in [
            '"directory": "./public"',
            '"main": "workers/intake-api/index.ts"',
            '"binding": "ASSETS"',
            '"/api/*"',
            '"d1_databases": [',
            '"html_handling": "drop-trailing-slash"',
            '"not_found_handling": "404-page"',
            '"compatibility_date": "2026-05-20"',
            '"env": {',
            '"preview": {',
            '"workers_dev": true',
        ]:
            if snippet not in wrangler:
                errors.append(f"wrangler.jsonc must contain {snippet!r}.")

    for relative_path in FORBIDDEN_PATHS:
        if (ROOT / relative_path).exists():
            errors.append(f"Obsolete path still exists: {relative_path}")

    for path in ROOT.iterdir():
        if path.name.startswith("."):
            continue
        if path.name not in ALLOWED_TOP_LEVEL:
            errors.append(f"Unexpected top-level path present: {path.name}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Holdings site validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
