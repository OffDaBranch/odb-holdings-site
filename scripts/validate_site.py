from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
WRANGLER = ROOT / "wrangler.jsonc"

FORBIDDEN_PATHS = [
    "agriculture.html",
    "assets",
    "automation.html",
    "data-room.html",
    "digital-assets.html",
    "ip-licensing.html",
    "partner-intake.html",
    "property-services.html",
    "script.js",
    "style.css",
    "workforce.html",
]

REQUIRED_SNIPPETS = [
    "Branch Off Holdings",
    "admin@branchoffholdings.com",
    "Request Partnership Meeting",
    "Operating Focus",
]


def main() -> int:
    errors: list[str] = []

    if not INDEX.exists():
        errors.append("index.html is missing.")
    else:
        html = INDEX.read_text(encoding="utf-8")
        for snippet in REQUIRED_SNIPPETS:
            if snippet not in html:
                errors.append(f"index.html must contain {snippet!r}.")

    if not WRANGLER.exists():
        errors.append("wrangler.jsonc is missing.")

    for relative_path in FORBIDDEN_PATHS:
        if (ROOT / relative_path).exists():
            errors.append(f"Placeholder path still exists: {relative_path}")

    for path in ROOT.iterdir():
        if path.is_file() and path.name not in {".gitignore", "index.html", "README.md", "wrangler.jsonc"}:
            errors.append(f"Unexpected top-level file present: {path.name}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    print("Holdings site validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
