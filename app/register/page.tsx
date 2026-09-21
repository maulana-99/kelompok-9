import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { registerAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthShell
      title="Create an account"
      subtitle="Pick a unique username and a password."
    >
      <AuthForm mode="register" action={registerAction} />
    </AuthShell>
  );
}
