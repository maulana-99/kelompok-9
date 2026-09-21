"use server";

import { redirect } from "next/navigation";

import { signIn, signOut, signUp } from "@/lib/auth";
import { isApiError } from "@/lib/errors";
import { safeRedirectPath } from "@/lib/redirect";
import type { AuthFormState } from "@/lib/validation";

/**
 * Thin Server Action transport: it reads the form, delegates to the auth
 * service, maps failures onto `AuthFormState`, and redirects on success. No
 * validation, hashing, SQL or cookie logic lives here.
 */

/** Runs `attempt`, converting an auth failure into form state for the UI. */
async function attempt(work: () => Promise<unknown>): Promise<AuthFormState> {
  try {
    await work();
    return {};
  } catch (error) {
    if (isApiError(error)) {
      return error.fieldErrors
        ? { errors: error.fieldErrors }
        : { message: error.message };
    }

    console.error("[auth] unexpected failure", error);
    return { message: "Something went wrong. Please try again." };
  }
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const failure = await attempt(() =>
    signUp({
      username: formData.get("username"),
      password: formData.get("password"),
    }),
  );

  if (failure.message || failure.errors) return failure;
  // Must stay outside any try/catch: redirect() works by throwing.
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const failure = await attempt(() =>
    signIn({
      username: formData.get("username"),
      password: formData.get("password"),
    }),
  );

  if (failure.message || failure.errors) return failure;
  redirect(safeRedirectPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
