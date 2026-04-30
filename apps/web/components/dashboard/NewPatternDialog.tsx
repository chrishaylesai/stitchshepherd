"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import type { FrameType } from "@stitchharbor/types";

import { Button } from "@/components/ui/button";
import {
  clampWholeNumber,
  formatInches,
  inchesToStitches,
  stitchesToInches,
  type DimensionUnit
} from "@/lib/dimensions";

type NewPatternDialogProps = {
  createAction: (formData: FormData) => void | Promise<void>;
};

const frameOptions: Array<{ label: string; value: FrameType }> = [
  { label: "None", value: "none" },
  { label: "Circle", value: "circle" },
  { label: "Oval", value: "oval" },
  { label: "Rectangle", value: "rectangle" }
];

export function NewPatternDialog({ createAction }: NewPatternDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState<DimensionUnit>("stitches");
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(60);
  const [fabricCount, setFabricCount] = useState(14);
  const [frameType, setFrameType] = useState<FrameType>("none");

  const stitchWidth = useMemo(
    () => (unit === "stitches" ? clampWholeNumber(width, 1, 1000) : clampWholeNumber(inchesToStitches(width, fabricCount), 1, 1000)),
    [fabricCount, unit, width]
  );
  const stitchHeight = useMemo(
    () => (unit === "stitches" ? clampWholeNumber(height, 1, 1000) : clampWholeNumber(inchesToStitches(height, fabricCount), 1, 1000)),
    [fabricCount, height, unit]
  );
  const inchWidth = stitchesToInches(stitchWidth, fabricCount);
  const inchHeight = stitchesToInches(stitchHeight, fabricCount);
  const setUnitPreservingSize = (nextUnit: DimensionUnit) => {
    if (nextUnit === unit) return;

    if (nextUnit === "inches") {
      setWidth(Number(stitchesToInches(stitchWidth, fabricCount).toFixed(2)));
      setHeight(Number(stitchesToInches(stitchHeight, fabricCount).toFixed(2)));
    } else {
      setWidth(stitchWidth);
      setHeight(stitchHeight);
    }

    setUnit(nextUnit);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        New pattern
      </Button>

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4"
          role="dialog"
        >
          <form
            action={createAction}
            className="w-full max-w-2xl rounded-lg border bg-card p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">New pattern</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stitchWidth} x {stitchHeight} stitches, {formatInches(inchWidth)} x {formatInches(inchHeight)} in
                </p>
              </div>
              <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                Close
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Title
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  name="title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Untitled Pattern"
                  value={title}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Fabric count
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  max={40}
                  min={6}
                  name="fabricCount"
                  onChange={(event) => setFabricCount(clampWholeNumber(Number(event.target.value), 6, 40))}
                  type="number"
                  value={fabricCount}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Frame
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  name="frameType"
                  onChange={(event) => setFrameType(event.target.value as FrameType)}
                  value={frameType}
                >
                  {frameOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="grid gap-2 md:col-span-2">
                <legend className="text-sm font-medium">Sizing</legend>
                <div className="inline-flex w-fit rounded-md border bg-background p-1">
                  <UnitButton active={unit === "stitches"} onClick={() => setUnitPreservingSize("stitches")}>
                    Stitches
                  </UnitButton>
                  <UnitButton active={unit === "inches"} onClick={() => setUnitPreservingSize("inches")}>
                    Inches
                  </UnitButton>
                </div>
              </fieldset>

              <DimensionField
                label="Width"
                max={unit === "stitches" ? 1000 : undefined}
                min={unit === "stitches" ? 1 : 0.1}
                onChange={setWidth}
                step={unit === "stitches" ? 1 : 0.1}
                unit={unit}
                value={width}
              />
              <DimensionField
                label="Height"
                max={unit === "stitches" ? 1000 : undefined}
                min={unit === "stitches" ? 1 : 0.1}
                onChange={setHeight}
                step={unit === "stitches" ? 1 : 0.1}
                unit={unit}
                value={height}
              />
            </div>

            <input name="dimensionUnit" type="hidden" value={unit} />
            <input name="gridWidth" type="hidden" value={stitchWidth} />
            <input name="gridHeight" type="hidden" value={stitchHeight} />
            <input name="inchWidth" type="hidden" value={unit === "inches" ? width : inchWidth} />
            <input name="inchHeight" type="hidden" value={unit === "inches" ? height : inchHeight} />

            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <CreateButton />
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Creating..." : "Create pattern"}
    </Button>
  );
}

function UnitButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-8 rounded px-3 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DimensionField({
  label,
  max,
  min,
  onChange,
  step,
  unit,
  value
}: {
  label: string;
  max?: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  unit: DimensionUnit;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="relative">
        <input
          className="h-10 w-full rounded-md border bg-background px-3 pr-20 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="number"
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {unit === "stitches" ? "stitches" : "inches"}
        </span>
      </div>
    </label>
  );
}
