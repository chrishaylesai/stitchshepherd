import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Signed in as {session.user.email}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pattern dashboard</h1>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
      <section className="mt-10 rounded-3xl border bg-card p-8">
        <h2 className="text-xl font-semibold">Phase 1 scaffold</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Authentication, database, and workspace foundation are wired. Pattern creation and editor functionality start in later phases.
        </p>
      </section>
    </main>
  );
}
