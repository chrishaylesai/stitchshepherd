"use client";

import { useState, type ReactNode } from "react";

import type { FrameConfig, FrameType } from "@stitchharbor/types";

import { Button } from "@/components/ui/button";
import { formatInches, inchesToStitches, stitchesToInches, type DimensionUnit } from "@/lib/dimensions";
import { hslToHex, isHexColor } from "@/lib/editor/color";
import {
  getPaletteUsage,
  useEditorPatternStore,
  useEditorUiStore
} from "@/stores/editorStore";

const LOCAL_DRAFT_ID = "local-draft";

export function EditorPanels({ currentUserId }: { currentUserId: string }) {
  const pattern = useEditorPatternStore((state) => state.pattern);
  const metadata = useEditorPatternStore((state) => state.metadata);
  const addPaletteColor = useEditorPatternStore((state) => state.addPaletteColor);
  const updatePaletteColor = useEditorPatternStore((state) => state.updatePaletteColor);
  const renamePaletteColor = useEditorPatternStore((state) => state.renamePaletteColor);
  const removePaletteColor = useEditorPatternStore((state) => state.removePaletteColor);
  const fillSelection = useEditorPatternStore((state) => state.fillSelection);
  const removeSelectedStitches = useEditorPatternStore((state) => state.removeSelectedStitches);
  const loadBenchmarkPattern = useEditorPatternStore((state) => state.loadBenchmarkPattern);
  const setFrameType = useEditorPatternStore((state) => state.setFrameType);
  const setFrameParam = useEditorPatternStore((state) => state.setFrameParam);
  const setPatternVisibility = useEditorPatternStore((state) => state.setPatternVisibility);

  const activePaletteIndex = useEditorUiStore((state) => state.activePaletteIndex);
  const selectedCells = useEditorUiStore((state) => state.selectedCells);
  const lastRenderMs = useEditorUiStore((state) => state.lastRenderMs);
  const setActivePaletteIndex = useEditorUiStore((state) => state.setActivePaletteIndex);
  const clearSelection = useEditorUiStore((state) => state.clearSelection);

  const [hexInput, setHexInput] = useState<string>(pattern.palette[activePaletteIndex]?.color ?? "#0f766e");
  const [hsl, setHsl] = useState({ h: 174, s: 47, l: 25 });
  const [frameUnit, setFrameUnit] = useState<DimensionUnit>("stitches");
  const usage = getPaletteUsage(pattern);
  const isLocalDraft = metadata.id === LOCAL_DRAFT_ID;
  const isOwner = metadata.userId === currentUserId;
  const canEditVisibility = isOwner && !isLocalDraft;

  return (
    <aside className="flex flex-col gap-4">
      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pattern Settings</p>
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{metadata.isPublic ? "Public" : "Private"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{getVisibilityNote({ canEditVisibility, isLocalDraft, isOwner })}</p>
          </div>
          <button
            aria-checked={metadata.isPublic}
            aria-label="Pattern visibility"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              metadata.isPublic ? "bg-primary" : "bg-muted-foreground/35"
            } ${canEditVisibility ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            disabled={!canEditVisibility}
            onClick={() => setPatternVisibility(!metadata.isPublic)}
            role="switch"
            type="button"
          >
            <span
              className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                metadata.isPublic ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Color Picker</p>
        <input
          className="h-12 w-full cursor-pointer rounded-md border bg-background p-1"
          type="color"
          value={pattern.palette[activePaletteIndex]?.color ?? "#000000"}
          onChange={(event) => {
            const value = event.target.value as `#${string}`;
            setHexInput(value);
            updatePaletteColor(activePaletteIndex, value);
          }}
        />
        <input
          className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
          value={hexInput}
          aria-label="Hex color"
          onChange={(event) => {
            const value = event.target.value;
            setHexInput(value);
            if (isHexColor(value)) {
              updatePaletteColor(activePaletteIndex, value);
            }
          }}
        />
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          {(["h", "s", "l"] as const).map((key) => (
            <label key={key} className="space-y-1">
              <span className="uppercase text-muted-foreground">{key}</span>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 outline-none ring-ring focus:ring-2"
                type="number"
                min={key === "h" ? 0 : 0}
                max={key === "h" ? 360 : 100}
                value={hsl[key]}
                onChange={(event) => {
                  const next = { ...hsl, [key]: Number(event.target.value) };
                  const nextHex = hslToHex(next.h, next.s, next.l);
                  setHsl(next);
                  setHexInput(nextHex);
                  updatePaletteColor(activePaletteIndex, nextHex);
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Palette</p>
          <Button onClick={() => addPaletteColor("#264653")} size="sm" type="button" variant="outline">
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {pattern.palette.map((entry, index) => (
            <div
              className={`rounded-xl border p-2 ${index === activePaletteIndex ? "border-primary bg-primary/5" : "bg-background"}`}
              key={entry.id}
            >
              <button
                className="flex w-full items-center gap-2 text-left"
                onClick={() => {
                  setActivePaletteIndex(index);
                  setHexInput(entry.color);
                }}
                type="button"
              >
                <span className="h-6 w-6 rounded-md border" style={{ backgroundColor: entry.color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.name ?? `Color ${index + 1}`}</span>
                <span className="text-xs text-muted-foreground">{usage.get(index) ?? 0}</span>
              </button>
              <div className="mt-2 flex gap-2">
                <input
                  className="h-8 min-w-0 flex-1 rounded-md border bg-card px-2 text-xs outline-none ring-ring focus:ring-2"
                  value={entry.name ?? ""}
                  aria-label={`Rename ${entry.name ?? `Color ${index + 1}`}`}
                  onChange={(event) => renamePaletteColor(index, event.target.value)}
                />
                <Button
                  disabled={pattern.palette.length <= 1}
                  onClick={() => removePaletteColor(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selection</p>
        <p className="text-sm text-muted-foreground">{selectedCells.length} selected cells</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button disabled={!selectedCells.length} onClick={() => fillSelection(selectedCells)} type="button">
            Fill
          </Button>
          <Button
            disabled={!selectedCells.length}
            onClick={() => {
              removeSelectedStitches(selectedCells);
              clearSelection();
            }}
            type="button"
            variant="outline"
          >
            Erase
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Frame</p>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Shape</span>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
            value={metadata.frame.type}
            onChange={(event) => setFrameType(event.target.value as FrameType)}
          >
            <option value="none">None</option>
            <option value="circle">Circle</option>
            <option value="oval">Oval</option>
            <option value="rectangle">Rectangle</option>
          </select>
        </label>
        <FrameParamControls
          fabricCount={metadata.fabricCount}
          frame={metadata.frame}
          setFrameParam={setFrameParam}
          setUnit={setFrameUnit}
          unit={frameUnit}
        />
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stats</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Grid" value={`${metadata.gridWidth}x${metadata.gridHeight}`} />
          <Metric
            label="Size"
            value={`${formatInches(stitchesToInches(metadata.gridWidth, metadata.fabricCount))}x${formatInches(
              stitchesToInches(metadata.gridHeight, metadata.fabricCount)
            )} in`}
          />
          <Metric label="Fabric" value={`${metadata.fabricCount} ct`} />
          <Metric label="Elements" value={String(metadata.stitchCount)} />
          <Metric label="Render" value={lastRenderMs == null ? "n/a" : `${lastRenderMs.toFixed(1)} ms`} />
        </dl>
        <Button className="mt-4 w-full" onClick={loadBenchmarkPattern} type="button" variant="outline">
          Load 100K benchmark
        </Button>
      </section>
    </aside>
  );
}

function FrameParamControls({
  fabricCount,
  frame,
  setFrameParam,
  setUnit,
  unit
}: {
  fabricCount: number;
  frame: FrameConfig;
  setFrameParam: (param: string, value: number) => void;
  setUnit: (unit: DimensionUnit) => void;
  unit: DimensionUnit;
}) {
  if (frame.type === "none") {
    return <p className="mt-3 text-sm text-muted-foreground">Choose a frame shape to preview clipping.</p>;
  }

  const updateDimension = (param: string, value: number) => {
    setFrameParam(param, unit === "inches" ? inchesToStitches(value, fabricCount) : value);
  };

  const controls = (
    <div className="mt-3 inline-flex rounded-md border bg-background p-1">
      <FrameUnitButton active={unit === "stitches"} onClick={() => setUnit("stitches")}>
        Stitches
      </FrameUnitButton>
      <FrameUnitButton active={unit === "inches"} onClick={() => setUnit("inches")}>
        Inches
      </FrameUnitButton>
    </div>
  );

  if (frame.type === "circle") {
    return (
      <>
        {controls}
        <div className="mt-3 grid grid-cols-1 gap-2">
          <DimensionNumberField
            fabricCount={fabricCount}
            label="Radius"
            unit={unit}
            value={frame.radius}
            onChange={(value) => updateDimension("radius", value)}
          />
        </div>
      </>
    );
  }

  if (frame.type === "oval") {
    return (
      <>
        {controls}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DimensionNumberField
            fabricCount={fabricCount}
            label="Width"
            unit={unit}
            value={frame.width}
            onChange={(value) => updateDimension("width", value)}
          />
          <DimensionNumberField
            fabricCount={fabricCount}
            label="Height"
            unit={unit}
            value={frame.height}
            onChange={(value) => updateDimension("height", value)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {controls}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DimensionNumberField
          fabricCount={fabricCount}
          label="Width"
          unit={unit}
          value={frame.width}
          onChange={(value) => updateDimension("width", value)}
        />
        <DimensionNumberField
          fabricCount={fabricCount}
          label="Height"
          unit={unit}
          value={frame.height}
          onChange={(value) => updateDimension("height", value)}
        />
        <NumberField label="X" min={0} value={frame.x ?? 0} onChange={(value) => setFrameParam("x", value)} />
        <NumberField label="Y" min={0} value={frame.y ?? 0} onChange={(value) => setFrameParam("y", value)} />
      </div>
    </>
  );
}

function getVisibilityNote({
  canEditVisibility,
  isLocalDraft,
  isOwner
}: {
  canEditVisibility: boolean;
  isLocalDraft: boolean;
  isOwner: boolean;
}) {
  if (canEditVisibility) {
    return "Owner access.";
  }

  if (isLocalDraft) {
    return "Local drafts are public by default.";
  }

  if (!isOwner) {
    return "Only the owner can change visibility.";
  }

  return "Visibility cannot be changed here.";
}

function FrameUnitButton({
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
      className={`h-7 rounded px-2 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DimensionNumberField({
  fabricCount,
  label,
  onChange,
  unit,
  value
}: {
  fabricCount: number;
  label: string;
  onChange: (value: number) => void;
  unit: DimensionUnit;
  value: number;
}) {
  const displayValue = unit === "inches" ? Number(stitchesToInches(value, fabricCount).toFixed(2)) : Math.round(value);

  return (
    <NumberField
      label={label}
      min={unit === "inches" ? 0.1 : 1}
      step={unit === "inches" ? 0.1 : 1}
      suffix={unit === "inches" ? "in" : "st"}
      value={displayValue}
      onChange={onChange}
    />
  );
}

function NumberField({
  label,
  min = 1,
  onChange,
  step = 1,
  suffix,
  value
}: {
  label: string;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          className={`h-9 w-full rounded-md border bg-background px-2 outline-none ring-ring focus:ring-2 ${suffix ? "pr-9" : ""}`}
          min={min}
          step={step}
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[0.68rem] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
