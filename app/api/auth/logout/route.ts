import { signOut } from "@/lib/auth";
import { json, toErrorResponse } from "@/lib/http";

/**
 * POST /api/auth/logout — revoke the session server-side and clear the cookie.
 *
 * 200 `{ data: { success: true } }` — idempotent, also when not signed in.
 */
export async function POST(): Promise<Response> {
  try {
    await signOut();
    return json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
