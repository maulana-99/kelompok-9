import { signIn } from "@/lib/auth";
import { json, parseJsonBody, toErrorResponse } from "@/lib/http";

/**
 * POST /api/auth/login — verify credentials and start a session.
 *
 * Body: `{ "username": string, "password": string }`
 * 200 `{ data: { user } }` · 400 malformed JSON · 401 invalid credentials
 * 422 validation error (with `fieldErrors`)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseJsonBody(request);
    const user = await signIn({
      username: body.username,
      password: body.password,
    });

    return json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
