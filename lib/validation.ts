import type { FieldErrors } from "@/lib/errors";

/**
 * Credential display limits, kept dependency-free so both the server-side
 * policy (`server/auth/credentials.policy.ts`) and Client Components render
 * from one source of truth. The rules themselves live on the server.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/**
 * Shape returned by the auth Server Actions and consumed by `useActionState`.
 * Lives here (not in a `'use server'` file) because a `'use server'` module may
 * only export async functions.
 */
export type AuthFormState = {
  errors?: FieldErrors;
  message?: string;
};
