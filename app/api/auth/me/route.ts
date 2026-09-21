import { getCurrentUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { json, toErrorResponse } from "@/lib/http";

/**
 * GET /api/auth/me — the currently signed-in user.
 *
 * 200 `{ data: { user } }` · 401 `UNAUTHORIZED` when there is no valid session.
 */
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) throw ApiError.unauthorized();

    return json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
