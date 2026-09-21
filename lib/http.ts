import { ApiError, isApiError } from "@/lib/errors";

/**
 * Web-standard helpers shared by Route Handlers. No Node built-ins and no
 * request-scoped Next.js APIs, so this module is safe anywhere.
 *
 * Every response uses the same envelope:
 *   success -> { data: ... }
 *   failure -> { error: { code, message, fieldErrors? } }
 */

export function json(data: unknown, status = 200): Response {
  return Response.json({ data }, { status });
}

export function toErrorResponse(error: unknown): Response {
  if (isApiError(error)) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error("[api] unhandled error", error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}

/** Reads a JSON object body, rejecting malformed or non-object payloads. */
export async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw ApiError.badRequest("Request body must be valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw ApiError.badRequest("Request body must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}
