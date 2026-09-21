import { signUp } from "@/lib/auth";
import { json, parseJsonBody, toErrorResponse } from "@/lib/http";

/**
 * POST /api/auth/register — create an account and start a session.
 *
 * Body: `{ "username": string, "password": string }`
 * 201 `{ data: { user } }` · 400 malformed JSON · 409 username taken
 * 422 validation error (with `fieldErrors`)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseJsonBody(request);
    const user = await signUp({
      username: body.username,
      password: body.password,
    });

    return json({ user }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
