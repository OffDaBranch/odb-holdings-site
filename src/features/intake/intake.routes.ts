import { classifyLead, createOpenAILeadClassifier } from "./intake.ai";
import { parseIntakeSubmission, IntakeValidationError } from "./intake.schema";
import { createIntakeLead, leadsToCsv, listIntakeLeads } from "./intake.service";
import type { IntakeApiEnv } from "./intake.types";

const API_PATHS = new Set(["/api/intake", "/api/public/intake/contact"]);

function createRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function errorResponse(requestId: string, status: number, code: string, message: string, details?: string[]): Response {
  return jsonResponse(
    {
      ok: false,
      request_id: requestId,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

async function safeTokenEqual(actual: string, expected: string): Promise<boolean> {
  if (!actual || !expected) {
    return false;
  }

  const encoder = new TextEncoder();
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < Math.max(actualBytes.length, expectedBytes.length); index += 1) {
    difference |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return difference === 0;
}

async function isAuthorized(request: Request, env: IntakeApiEnv): Promise<boolean> {
  const configuredToken = env.ADMIN_BEARER_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme !== "Bearer" || !token) {
    return false;
  }

  return safeTokenEqual(token, configuredToken);
}

function hasAdminToken(env: IntakeApiEnv): boolean {
  return Boolean(env.ADMIN_BEARER_TOKEN?.trim());
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 32_000) {
    throw new IntakeValidationError(["request body must be 32000 bytes or fewer"]);
  }

  return request.json();
}

async function handlePostIntake(request: Request, env: IntakeApiEnv, requestId: string): Promise<Response> {
  let payload: unknown;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      return errorResponse(requestId, 400, "validation_error", error.message, error.details);
    }

    return errorResponse(requestId, 400, "invalid_json", "Request body must be valid JSON.");
  }

  let submission;
  try {
    submission = parseIntakeSubmission(payload);
  } catch (error) {
    if (error instanceof IntakeValidationError) {
      return errorResponse(requestId, 400, "validation_error", error.message, error.details);
    }

    throw error;
  }

  if (submission.website) {
    return jsonResponse({ ok: true, request_id: requestId, status: "received" }, { status: 202 });
  }

  const aiClassifier = env.OPENAI_API_KEY
    ? createOpenAILeadClassifier({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
      })
    : undefined;

  const classification = await classifyLead(submission, { aiClassifier });
  const result = await createIntakeLead({
    db: env.DB,
    submission,
    classification,
    requestId,
  });

  return jsonResponse(
    {
      ok: true,
      request_id: requestId,
      lead_id: result.lead.id,
      status: result.lead.status,
      classification,
      queued_targets: result.queuedTargets,
    },
    { status: 201 },
  );
}

async function handleAdminLeads(request: Request, env: IntakeApiEnv, requestId: string): Promise<Response> {
  if (!hasAdminToken(env)) {
    return errorResponse(requestId, 503, "admin_not_configured", "ADMIN_BEARER_TOKEN must be configured before admin routes can be used.");
  }

  if (!(await isAuthorized(request, env))) {
    return errorResponse(requestId, 401, "unauthorized", "A valid admin bearer token is required.");
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const leads = await listIntakeLeads(env.DB, limit);
  return jsonResponse({ ok: true, request_id: requestId, leads });
}

async function handleAdminExport(request: Request, env: IntakeApiEnv, requestId: string): Promise<Response> {
  if (!hasAdminToken(env)) {
    return errorResponse(requestId, 503, "admin_not_configured", "ADMIN_BEARER_TOKEN must be configured before admin routes can be used.");
  }

  if (!(await isAuthorized(request, env))) {
    return errorResponse(requestId, 401, "unauthorized", "A valid admin bearer token is required.");
  }

  const leads = await listIntakeLeads(env.DB, 500);
  return new Response(leadsToCsv(leads), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="branchops-intake-${requestId}.csv"`,
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}

export async function handleIntakeApiRequest(request: Request, env: IntakeApiEnv): Promise<Response> {
  const requestId = createRequestId();
  const url = new URL(request.url);

  try {
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": url.origin,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "authorization,content-type",
          "access-control-max-age": "600",
          "x-request-id": requestId,
        },
      });
    }

    if (API_PATHS.has(url.pathname)) {
      if (request.method !== "POST") {
        return errorResponse(requestId, 405, "method_not_allowed", "Use POST for intake submissions.");
      }

      return handlePostIntake(request, env, requestId);
    }

    if (url.pathname === "/api/admin/leads") {
      if (request.method !== "GET") {
        return errorResponse(requestId, 405, "method_not_allowed", "Use GET for admin lead access.");
      }

      return handleAdminLeads(request, env, requestId);
    }

    if (url.pathname === "/api/admin/export.csv") {
      if (request.method !== "GET") {
        return errorResponse(requestId, 405, "method_not_allowed", "Use GET for CSV export.");
      }

      return handleAdminExport(request, env, requestId);
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(requestId, 404, "not_found", "API route not found.");
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  } catch {
    return errorResponse(requestId, 500, "internal_error", "The intake request could not be completed.");
  }
}
