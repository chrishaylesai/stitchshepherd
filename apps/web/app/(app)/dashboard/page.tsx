import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";

import { createCaller } from "@stitchharbor/api";
import type { FrameConfig, FrameType } from "@stitchharbor/types";

import { auth, signOut } from "@/lib/auth";
import { NewPatternDialog } from "@/components/dashboard/NewPatternDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { clampWholeNumber, inchesToStitches, type DimensionUnit } from "@/lib/dimensions";

async function createPatternAction(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const fabricCount = clampWholeNumber(readInteger(formData, "fabricCount", 14), 6, 40);
  const unit = readDimensionUnit(formData.get("dimensionUnit"));
  const gridWidth =
    unit === "inches"
      ? clampWholeNumber(inchesToStitches(readNumber(formData, "inchWidth", 80 / fabricCount), fabricCount), 1, 1000)
      : clampWholeNumber(readInteger(formData, "gridWidth", 80), 1, 1000);
  const gridHeight =
    unit === "inches"
      ? clampWholeNumber(inchesToStitches(readNumber(formData, "inchHeight", 60 / fabricCount), fabricCount), 1, 1000)
      : clampWholeNumber(readInteger(formData, "gridHeight", 60), 1, 1000);
  const frameType = readFrameType(formData.get("frameType"));
  const caller = createCaller({ session });
  const created = await caller.patterns.create({
    title: readString(formData, "title", "Untitled Pattern"),
    gridWidth,
    gridHeight,
    fabricCount,
    frame: createDefaultFrame(frameType, gridWidth, gridHeight)
  });

  revalidatePath("/dashboard");
  redirect(`/editor?patternId=${created.metadata.id}`);
}

async function deletePatternAction(formData: FormData) {
  "use server";

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const id = readString(formData, "id", "");

  if (id) {
    const caller = createCaller({ session });
    await caller.patterns.delete({ id });
  }

  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const caller = createCaller({ session });
  const patternList = await caller.patterns.list();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Signed in as {session.user.email}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pattern dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewPatternDialog createAction={createPatternAction} />
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
      </div>

      <section className="mt-10">
        <div className="grid gap-3">
          {patternList.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">No patterns yet.</div>
          ) : (
            patternList.map((pattern) => (
              <article
                className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[128px_minmax(0,1fr)_auto] md:items-center"
                key={pattern.id}
              >
                <div className="h-24 w-32 overflow-hidden rounded-md border bg-[#f4ecd9]">
                  {pattern.thumbnailUrl ? (
                    <Image
                      alt={`${pattern.title} thumbnail`}
                      className="h-full w-full object-cover"
                      height={96}
                      loading="lazy"
                      src={pattern.thumbnailUrl}
                      unoptimized
                      width={128}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                      No thumbnail
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{pattern.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {pattern.gridWidth} x {pattern.gridHeight}
                    </span>
                    <span>{pattern.fabricCount} ct</span>
                    <span>{pattern.stitchCount.toLocaleString()} stitches</span>
                    <span>{pattern.isPublic ? "Public" : "Private"}</span>
                    <span>Updated {formatDate(pattern.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link className={buttonVariants({ variant: "outline" })} href={`/patterns/${pattern.id}`} prefetch={false}>
                    View
                  </Link>
                  <Link className={buttonVariants({ variant: "outline" })} href={`/editor?patternId=${pattern.id}`}>
                    Open
                  </Link>
                  <form action={deletePatternAction}>
                    <input name="id" type="hidden" value={pattern.id} />
                    <Button type="submit" variant="destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function readString(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);

  if (typeof value !== "string") return fallback;

  return value.trim() || fallback;
}

function readInteger(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));

  if (!Number.isInteger(value)) return fallback;

  return value;
}

function readNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));

  if (!Number.isFinite(value)) return fallback;

  return value;
}

function readDimensionUnit(value: FormDataEntryValue | null): DimensionUnit {
  return value === "inches" ? "inches" : "stitches";
}

function readFrameType(value: FormDataEntryValue | null): FrameType {
  return value === "circle" || value === "oval" || value === "rectangle" ? value : "none";
}

function createDefaultFrame(frameType: FrameType, gridWidth: number, gridHeight: number): FrameConfig {
  const centerX = gridWidth / 2;
  const centerY = gridHeight / 2;

  switch (frameType) {
    case "circle":
      return {
        type: "circle",
        radius: Math.max(1, Math.floor(Math.min(gridWidth, gridHeight) * 0.38)),
        centerX,
        centerY
      };
    case "oval":
      return {
        type: "oval",
        width: Math.max(1, Math.floor(gridWidth * 0.75)),
        height: Math.max(1, Math.floor(gridHeight * 0.68)),
        centerX,
        centerY
      };
    case "rectangle":
      return {
        type: "rectangle",
        width: Math.max(1, Math.floor(gridWidth * 0.75)),
        height: Math.max(1, Math.floor(gridHeight * 0.68)),
        x: Math.floor(gridWidth * 0.125),
        y: Math.floor(gridHeight * 0.16)
      };
    case "none":
      return { type: "none" };
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}
