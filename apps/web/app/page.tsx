import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary)),transparent_34rem),linear-gradient(135deg,hsl(var(--background)),hsl(42_34%_90%))]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-20">
        <p className="mb-5 w-fit rounded-full border bg-card/80 px-4 py-2 text-sm font-medium text-muted-foreground">
          Canvas-first pattern design
        </p>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
              Cross-stitch patterns without fighting the grid.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              StitchHarbor is being built for fast canvas editing, public pattern sharing, and PDF symbol chart export.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Sign in with email</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-[2rem] border bg-card/80 p-4 shadow-2xl shadow-primary/10">
            <div className="grid aspect-square grid-cols-10 overflow-hidden rounded-[1.5rem] border bg-background">
              {Array.from({ length: 100 }).map((_, index) => (
                <div
                  className="border border-border/60"
                  style={{
                    backgroundColor: index % 7 === 0 || index % 13 === 0 ? "hsl(var(--accent) / 0.55)" : "transparent"
                  }}
                  key={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
