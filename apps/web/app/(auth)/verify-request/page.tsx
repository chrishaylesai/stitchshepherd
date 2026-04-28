import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          If the address is valid, a magic link is on its way. The link signs you in and opens your dashboard.
        </p>
        <Link className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline" href="/login">
          Use a different email
        </Link>
      </section>
    </main>
  );
}
