"use client";

import { useState } from "react";

import type { FrameConfig, FrameType } from "@stitchharbor/types";

import { Button } from "@/components/ui/button";
import { hslToHex, isHexColor } from "@/lib/editor/color";
import {
  getPaletteUsage,
  useEditorPatternStore,
  useEditorUiStore
} from "@/stores/editorStore";

export function EditorPanels() {
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

  const activePaletteIndex = useEditorUiStore((state) => state.activePaletteIndex);
  const selectedCells = useEditorUiStore((state) => state.selectedCells);
  const lastRenderMs = useEditorUiStore((state) => state.lastRenderMs);
  const setActivePaletteIndex = useEditorUiStore((state) => state.setActivePaletteIndex);
  const clearSelection = useEditorUiStore((state) => state.clearSelection);

  const [hexInput, setHexInput] = useState<string>(pattern.palette[activePaletteIndex]?.color ?? "#0f766e");
  const [hsl, setHsl] = useState({ h: 174, s: 47, l: 25 });
  const usage = getPaletteUsage(pattern);

  return (
    <aside className="flex flex-col gap-4">
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
        <FrameParamControls frame={metadata.frame} setFrameParam={setFrameParam} />
      </section>

      <section className="rounded-3xl border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stats</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Grid" value={`${metadata.gridWidth}x${metadata.gridHeight}`} />
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
  frame,
  setFrameParam
}: {
  frame: FrameConfig;
  setFrameParam: (param: string, value: number) => void;
}) {
  if (frame.type === "none") {
    return <p className="mt-3 text-sm text-muted-foreground">Choose a frame shape to preview clipping.</p>;
  }

  if (frame.type === "circle") {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2">
        <NumberField label="Radius" value={frame.radius} onChange={(value) => setFrameParam("radius", value)} />
      </div>
    );
  }

  if (frame.type === "oval") {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField label="Width" value={frame.width} onChange={(value) => setFrameParam("width", value)} />
        <NumberField label="Height" value={frame.height} onChange={(value) => setFrameParam("height", value)} />
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <NumberField label="Width" value={frame.width} onChange={(value) => setFrameParam("width", value)} />
      <NumberField label="Height" value={frame.height} onChange={(value) => setFrameParam("height", value)} />
      <NumberField label="X" value={frame.x ?? 0} onChange={(value) => setFrameParam("x", value)} />
      <NumberField label="Y" value={frame.y ?? 0} onChange={(value) => setFrameParam("y", value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input
        className="h-9 w-full rounded-md border bg-background px-2 outline-none ring-ring focus:ring-2"
        min={1}
        type="number"
        value={Math.round(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
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
