import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { createCaller } from "@stitchharbor/api";

import { ReadOnlyPatternCanvas } from "@/components/pattern/ReadOnlyPatternCanvas";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type PatternCaller = ReturnType<typeof createCaller>;

type PatternPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatternPage({ params }: PatternPageProps) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const session = await auth();
  const caller = createCaller({ session });
  const pattern = await loadPatternOrNotFound(caller, id, Boolean(session?.user?.id));
  const isOwner = Boolean(session?.user?.id && session.user.id === pattern.metadata.userId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
      <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" href="/">
          StitchHarbor
        </Link>
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <Link className={buttonVariants({ variant: "outline" })} href={`/editor?patternId=${pattern.metadata.id}`}>
              Open in editor
            </Link>
          ) : null}
          <Link className={buttonVariants({ variant: "outline" })} href="/dashboard">
            Dashboard
          </Link>
        </div>
      </nav>

      <header className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>{pattern.metadata.isPublic ? "Public pattern" : "Private pattern"}</span>
            <span>{pattern.metadata.fabricCount} ct fabric</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{pattern.metadata.title}</h1>
          {pattern.metadata.description ? (
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{pattern.metadata.description}</p>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
          <Stat label="Size" value={`${pattern.metadata.gridWidth} x ${pattern.metadata.gridHeight}`} />
          <Stat label="Stitches" value={pattern.metadata.stitchCount.toLocaleString()} />
          <Stat label="Colors" value={pattern.metadata.colorCount.toLocaleString()} />
          <Stat label="Updated" value={formatDate(pattern.metadata.updatedAt)} />
        </dl>
      </header>

      <ReadOnlyPatternCanvas content={pattern.content} metadata={pattern.metadata} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Palette</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pattern.content.palette.length === 0 ? (
            <p className="text-sm text-muted-foreground">No colors in this pattern yet.</p>
          ) : (
            pattern.content.palette.map((entry) => (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3" key={entry.id}>
                <span
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded border"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.name ?? `Color ${entry.id + 1}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.color} / {entry.symbol}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold">{value}</dd>
    </div>
  );
}

async function loadPatternOrNotFound(caller: PatternCaller, id: string, canLoadOwned: boolean) {
  try {
    return await caller.patterns.load({ id });
  } catch (error) {
    if (isNotFoundError(error)) {
      if (canLoadOwned) {
        return loadOwnedPatternOrNotFound(caller, id);
      }

      notFound();
    }

    throw error;
  }
}

async function loadOwnedPatternOrNotFound(caller: PatternCaller, id: string) {
  try {
    return await caller.patterns.loadOwned({ id });
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}

function isNotFoundError(error: unknown) {
  return error instanceof TRPCError && error.code === "NOT_FOUND";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
