import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const WRANGLER = path.join(ROOT, "wrangler.jsonc");

const requiredPaths = [
  path.join(PUBLIC, "index.html"),
  path.join(PUBLIC, "styles.css"),
  path.join(PUBLIC, "site.js"),
  path.join(PUBLIC, "404.html"),
  path.join(PUBLIC, "about", "index.html"),
  path.join(PUBLIC, "companies", "index.html"),
  path.join(PUBLIC, "companies", "branchops", "index.html"),
  path.join(PUBLIC, "companies", "trapcotton", "index.html"),
  path.join(PUBLIC, "assets", "index.html"),
  path.join(PUBLIC, "assets", "brand-assets", "index.html"),
  path.join(PUBLIC, "assets", "operating-systems", "index.html"),
  path.join(PUBLIC, "assets", "digital-property", "index.html"),
  path.join(PUBLIC, "licensing", "index.html"),
  path.join(PUBLIC, "contact", "index.html"),
  path.join(PUBLIC, "admin", "leads-dashboard", "index.html"),
  path.join(PUBLIC, "admin", "leads-dashboard.js"),
  path.join(PUBLIC, "privacy", "index.html"),
  path.join(ROOT, "src", "features", "intake", "intake.schema.ts"),
  path.join(ROOT, "src", "features", "intake", "intake.routes.ts"),
  path.join(ROOT, "src", "features", "intake", "intake.service.ts"),
  path.join(ROOT, "src", "features", "intake", "intake.ai.ts"),
  path.join(ROOT, "src", "features", "intake", "intake.types.ts"),
  path.join(ROOT, "src", "features", "intake", "intake.sync.ts"),
  path.join(ROOT, "workers", "intake-api", "index.ts"),
  path.join(ROOT, "migrations", "0001_create_intake_tables.sql"),
  path.join(ROOT, "docs", "WEBSITE_INQUIRY_INTAKE.md"),
  path.join(ROOT, "docs", "INTAKE_OS_PRODUCT_SPEC.md"),
  path.join(ROOT, "docs", "DATABASE_SCHEMA.md"),
  path.join(ROOT, "docs", "API_ROUTES.md"),
  path.join(ROOT, "docs", "ASSET_REGISTRATION.md"),
  path.join(ROOT, "docs", "DEPLOYMENT.md"),
  path.join(ROOT, "tests", "intake.test.ts"),
];

const pageExpectations = new Map([
  [path.join(PUBLIC, "index.html"), ["Founder-led holding company", 'href="/about"', 'href="/companies"', 'href="/assets"', 'href="/licensing"', 'href="/contact"', 'href="/companies/branchops"', 'href="/companies/trapcotton"', 'href="/assets/digital-property"']],
  [path.join(PUBLIC, "about", "index.html"), ["HoldCo Model", "Ownership Philosophy"]],
  [path.join(PUBLIC, "companies", "index.html"), ["Companies And Brands", "Current Portfolio Map", 'href="/companies/branchops"', 'href="/companies/trapcotton"']],
  [path.join(PUBLIC, "companies", "branchops", "index.html"), ["BranchOps", "Operating Scope", 'href="/assets/operating-systems"']],
  [path.join(PUBLIC, "companies", "trapcotton", "index.html"), ["TrapCotton", "Brand System", 'href="/licensing"']],
  [path.join(PUBLIC, "assets", "index.html"), ["Assets And Projects", "Asset Classes", 'href="/assets/brand-assets"', 'href="/assets/operating-systems"', 'href="/assets/digital-property"']],
  [path.join(PUBLIC, "assets", "brand-assets", "index.html"), ["Brand Assets", "TrapCotton", 'href="/companies/trapcotton"']],
  [path.join(PUBLIC, "assets", "operating-systems", "index.html"), ["Operating Systems", "BranchOps", 'href="/companies/branchops"']],
  [path.join(PUBLIC, "assets", "digital-property", "index.html"), ["Digital Property", "Controlled Surfaces", 'href="/contact"']],
  [path.join(PUBLIC, "licensing", "index.html"), ["Licensing And IP", "What Can Be Licensed"]],
  [path.join(PUBLIC, "contact", "index.html"), ['data-contact-form', "Partnerships", "Licensing", "Grant / Vendor Readiness", "consent_checkbox"]],
  [path.join(PUBLIC, "admin", "leads-dashboard", "index.html"), ["Lead intake dashboard.", "data-admin-auth", "data-export-csv"]],
  [path.join(PUBLIC, "privacy", "index.html"), ["How inquiry data is handled.", "Human review", "admin@branchoffholdings.com"]],
  [path.join(PUBLIC, "404.html"), ["The page you requested is not available.", 'href="/"']],
]);

const sharedHtmlSnippets = ["Branch Off Holdings", '<nav class="header-links"', '<footer class="site-footer">', 'rel="canonical"'];
const forbiddenPaths = [
  "agriculture.html",
  "automation.html",
  "data-room.html",
  "digital-assets.html",
  "ip-licensing.html",
  "partner-intake.html",
  "privacy.html",
  "property-services.html",
  "workforce.html",
];

const allowedTopLevel = new Set([
  ".gitignore",
  "AGENTS.md",
  "README.md",
  "docs",
  "migrations",
  "node_modules",
  "package-lock.json",
  "package.json",
  "public",
  "scripts",
  "src",
  "tests",
  "tsconfig.json",
  "vitest.config.ts",
  "workers",
  "wrangler.jsonc",
]);

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

const errors = [];

for (const filePath of requiredPaths) {
  if (!existsSync(filePath)) {
    errors.push(`Required path is missing: ${rel(filePath)}`);
  }
}

for (const [filePath, snippets] of pageExpectations.entries()) {
  if (!existsSync(filePath)) {
    continue;
  }

  const html = readText(filePath);
  for (const snippet of sharedHtmlSnippets) {
    if (!html.includes(snippet)) {
      errors.push(`${rel(filePath)} must contain ${JSON.stringify(snippet)}.`);
    }
  }

  for (const snippet of snippets) {
    if (!html.includes(snippet)) {
      errors.push(`${rel(filePath)} must contain ${JSON.stringify(snippet)}.`);
    }
  }
}

const cssPath = path.join(PUBLIC, "styles.css");
if (existsSync(cssPath)) {
  const css = readText(cssPath);
  for (const snippet of [":root", ".site-header", ".page-hero", ".contact-form"]) {
    if (!css.includes(snippet)) {
      errors.push(`public/styles.css must contain ${JSON.stringify(snippet)}.`);
    }
  }
}

const siteJsPath = path.join(PUBLIC, "site.js");
if (existsSync(siteJsPath)) {
  const js = readText(siteJsPath);
  for (const snippet of ['"/api/intake"', "data-contact-form", "IntersectionObserver", "consent_checkbox"]) {
    if (!js.includes(snippet)) {
      errors.push(`public/site.js must contain ${JSON.stringify(snippet)}.`);
    }
  }
}

const adminJsPath = path.join(PUBLIC, "admin", "leads-dashboard.js");
if (existsSync(adminJsPath)) {
  const js = readText(adminJsPath);
  for (const snippet of ["/api/admin/leads", "/api/admin/export.csv", "textContent"]) {
    if (!js.includes(snippet)) {
      errors.push(`public/admin/leads-dashboard.js must contain ${JSON.stringify(snippet)}.`);
    }
  }
}

if (!existsSync(WRANGLER)) {
  errors.push("wrangler.jsonc is missing.");
} else {
  const wrangler = readText(WRANGLER);
  for (const snippet of [
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
  ]) {
    if (!wrangler.includes(snippet)) {
      errors.push(`wrangler.jsonc must contain ${JSON.stringify(snippet)}.`);
    }
  }
}

for (const relativePath of forbiddenPaths) {
  if (existsSync(path.join(ROOT, relativePath))) {
    errors.push(`Obsolete path still exists: ${relativePath}`);
  }
}

for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  if (entry.name.startsWith(".") && entry.name !== ".gitignore") {
    continue;
  }

  if (!allowedTopLevel.has(entry.name)) {
    errors.push(`Unexpected top-level path present: ${entry.name}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log("Holdings site validation passed.");
