"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  type AuthFormState,
} from "@/lib/validation";

type AuthFormProps = {
  mode: "login" | "register";
  action: (
    prevState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  /** Same-origin path to return to after a successful sign-in. */
  next?: string;
};

const initialState: AuthFormState = {};

const fieldClass =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base text-black outline-none transition focus:border-black/40 focus:ring-2 focus:ring-black/10 dark:border-white/20 dark:bg-black dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10";

export function AuthForm({ mode, action, next }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          minLength={isRegister ? USERNAME_MIN : undefined}
          maxLength={USERNAME_MAX}
          aria-invalid={state.errors?.username ? true : undefined}
          aria-describedby={state.errors?.username ? "username-error" : undefined}
          className={fieldClass}
        />
        {isRegister ? (
          <p className="text-xs text-zinc-500">
            {USERNAME_MIN}–{USERNAME_MAX} characters: lowercase letters, numbers
            and underscores. Must be unique.
          </p>
        ) : null}
        {state.errors?.username ? (
          <p
            id="username-error"
            role="alert"
            className="text-sm text-red-700 dark:text-red-400"
          >
            {state.errors.username}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? PASSWORD_MIN : undefined}
          aria-invalid={state.errors?.password ? true : undefined}
          aria-describedby={state.errors?.password ? "password-error" : undefined}
          className={fieldClass}
        />
        {isRegister ? (
          <p className="text-xs text-zinc-500">
            At least {PASSWORD_MIN} characters.
          </p>
        ) : null}
        {state.errors?.password ? (
          <p
            id="password-error"
            role="alert"
            className="text-sm text-red-700 dark:text-red-400"
          >
            {state.errors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? isRegister
            ? "Creating account…"
            : "Signing in…"
          : isRegister
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {isRegister ? "Already have an account? " : "Need an account? "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isRegister ? "Sign in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
