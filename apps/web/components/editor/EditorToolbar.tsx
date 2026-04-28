"use client";

import type React from "react";

import { StitchType } from "@stitchharbor/types";
import { MousePointer2, Move, Paintbrush, PenLine, Pipette, Spline, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { redoPatternChange, undoPatternChange, useEditorUiStore, type EditorTool } from "@/stores/editorStore";

const tools: Array<{
  id: EditorTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "stitch", label: "Stitch", icon: Paintbrush },
  { id: "backstitch", label: "Backstitch", icon: PenLine },
  { id: "knot", label: "Knot", icon: Spline },
  { id: "eraser", label: "Eraser", icon: Trash2 },
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pan", label: "Pan", icon: Move }
];

const stitchTypes = [
  { value: StitchType.Full, label: "Full cross" },
  { value: StitchType.HalfTopLeftToBottomRight, label: "Half TL-BR" },
  { value: StitchType.HalfBottomLeftToTopRight, label: "Half BL-TR" },
  { value: StitchType.QuarterTopLeft, label: "Quarter top-left" },
  { value: StitchType.QuarterTopRight, label: "Quarter top-right" },
  { value: StitchType.QuarterBottomLeft, label: "Quarter bottom-left" },
  { value: StitchType.QuarterBottomRight, label: "Quarter bottom-right" },
  { value: StitchType.ThreeQuarterTopLeft, label: "Three-quarter top-left" },
  { value: StitchType.ThreeQuarterTopRight, label: "Three-quarter top-right" },
  { value: StitchType.ThreeQuarterBottomLeft, label: "Three-quarter bottom-left" },
  { value: StitchType.ThreeQuarterBottomRight, label: "Three-quarter bottom-right" }
];

export function EditorToolbar() {
  const activeTool = useEditorUiStore((state) => state.activeTool);
  const activeStitchType = useEditorUiStore((state) => state.activeStitchType);
  const setTool = useEditorUiStore((state) => state.setTool);
  const setActiveStitchType = useEditorUiStore((state) => state.setActiveStitchType);

  return (
    <aside className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-sm">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tools</p>
        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const selected = activeTool === tool.id;
            return (
              <Button
                className={cn("justify-start", selected && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}
                key={tool.id}
                onClick={() => setTool(tool.id)}
                size="sm"
                type="button"
                variant={selected ? "outline" : "secondary"}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Pipette className="h-3.5 w-3.5" />
          Stitch Type
        </label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
          value={activeStitchType}
          onChange={(event) => setActiveStitchType(Number(event.target.value) as StitchType)}
        >
          {stitchTypes.map((stitchType) => (
            <option key={stitchType.value} value={stitchType.value}>
              {stitchType.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={undoPatternChange} type="button" variant="outline">
          Undo
        </Button>
        <Button onClick={redoPatternChange} type="button" variant="outline">
          Redo
        </Button>
      </div>
    </aside>
  );
}
