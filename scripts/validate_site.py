from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WRANGLER = ROOT / "wrangler.jsonc"

REQUIRED_PATHS = [
    ROOT / "index.html",
    ROOT / "styles.css",
    ROOT / "site.js",
    ROOT / "404.html",
    ROOT / "about" / "index.html",
    ROOT / "companies" / "index.html",
    ROOT / "assets" / "index.html",
    ROOT / "licensing" / "index.html",
    ROOT / "contact" / "index.html",
    ROOT / "privacy" / "index.html",
]

PAGE_EXPECTATIONS = {
    ROOT / "index.html": [
        "Founder-led holding company",
        'href="/about"',
        'href="/companies"',
        'href="/assets"',
        'href="/licensing"',
        'href="/contact"',
    ],
    ROOT / "about" / "index.html": [
        "HoldCo Model",
        "Ownership Philosophy",
    ],
    ROOT / "companies" / "index.html": [
        "Companies And Brands",
        "Current Portfolio Map",
    ],
    ROOT / "assets" / "index.html": [
        "Assets And Projects",
        "Asset Classes",
    ],
    ROOT / "licensing" / "index.html": [
        "Licensing And IP",
        "What Can Be Licensed",
    ],
    ROOT / "contact" / "index.html": [
        'data-contact-form',
        "Partnerships",
        "Licensing",
    ],
    ROOT / "privacy" / "index.html": [
        "How inquiry data is handled.",
        "admin@branchoffholdings.com",
    ],
    ROOT / "404.html": [
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
    "404.html",
    "README.md",
    "about",
    "assets",
    "companies",
    "contact",
    "index.html",
    "licensing",
    "privacy",
    "scripts",
    "site.js",
    "styles.css",
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

    styles = ROOT / "styles.css"
    if styles.exists():
        css = styles.read_text(encoding="utf-8")
        for snippet in [":root", ".site-header", ".page-hero", ".contact-form"]:
            if snippet not in css:
                errors.append(f"styles.css must contain {snippet!r}.")

    script = ROOT / "site.js"
    if script.exists():
        js = script.read_text(encoding="utf-8")
        for snippet in ['"/api/public/intake/contact"', "data-contact-form", "IntersectionObserver"]:
            if snippet not in js:
                errors.append(f"site.js must contain {snippet!r}.")

    if not WRANGLER.exists():
        errors.append("wrangler.jsonc is missing.")
    else:
        wrangler = WRANGLER.read_text(encoding="utf-8")
        for snippet in [
            '"html_handling": "drop-trailing-slash"',
            '"not_found_handling": "404-page"',
            '"compatibility_date": "2026-04-12"',
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
