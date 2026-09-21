import "server-only";

import type { FieldErrors } from "@/lib/errors";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
} from "@/lib/validation";

/**
 * Credential *policy*. Kept on the server so the rules cannot be edited by the
 * client, and shared by the register and login flows. The numeric limits come
 * from `lib/validation.ts` so the UI and the server never drift apart.
 */

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export class CredentialsValidationError extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors) {
    super("Some fields need your attention.");
    this.name = "CredentialsValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Validates and normalises credentials. Registration enforces the full
 * password policy; login only requires a non-empty value so accounts created
 * before a policy change can still sign in.
 */
export function validateCredentials(
  mode: "register" | "login",
  raw: { username: unknown; password: unknown },
): { username: string; password: string } {
  const username =
    typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const password = typeof raw.password === "string" ? raw.password : "";
  const fieldErrors: FieldErrors = {};

  if (username.length === 0) {
    fieldErrors.username = "Username is required.";
  } else if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    fieldErrors.username = `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    fieldErrors.username =
      "Username may only contain lowercase letters, numbers and underscores.";
  }

  if (password.length === 0) {
    fieldErrors.password = "Password is required.";
  } else if (mode === "register" && password.length < PASSWORD_MIN) {
    fieldErrors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  } else if (password.length > PASSWORD_MAX) {
    fieldErrors.password = `Password must be at most ${PASSWORD_MAX} characters.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new CredentialsValidationError(fieldErrors);
  }

  return { username, password };
}
