/**
 * Pure redirect-target sanitising, shared by the Server Actions and the REST
 * handlers.
 */

/**
 * Accepts only same-origin paths (a single leading slash). This rejects
 * absolute (`https://…`) and protocol-relative (`//…`) targets, so a crafted
 * `?next=` value cannot turn the login flow into an open redirect.
 */
export function safeRedirectPath(
  value: unknown,
  fallback = "/dashboard",
): string {
  if (typeof value !== "string") return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
