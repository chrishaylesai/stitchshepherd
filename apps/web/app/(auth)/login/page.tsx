import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-xl"
        action={async (formData) => {
          "use server";
          const email = String(formData.get("email") ?? "");
          await signIn("resend", { email, redirectTo: "/dashboard" });
        }}
      >
        <h1 className="text-3xl font-semibold tracking-tight">Sign in to StitchHarbor</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enter your email and Auth.js will send a passwordless magic link through Resend.
        </p>
        <label className="mt-8 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          className="mt-2 h-11 w-full rounded-md border bg-background px-3 outline-none ring-ring transition focus:ring-2"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Button className="mt-6 w-full" type="submit">
          Send magic link
        </Button>
      </form>
    </main>
  );
}
