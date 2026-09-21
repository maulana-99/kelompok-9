import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");

  const { next } = await props.searchParams;
  const target = typeof next === "string" ? next : undefined;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your username and password to continue."
    >
      <AuthForm mode="login" action={loginAction} next={target} />
    </AuthShell>
  );
}
