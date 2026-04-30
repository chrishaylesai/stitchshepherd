"use client";

import { create } from "zustand";
import { travel } from "zustand-travel";

import {
  EMPTY_PATTERN_CONTENT,
  StitchType,
  type BackstitchData,
  type FrameConfig,
  type FrameType,
  type GridCoord,
  type KnotData,
  type PaletteEntry,
  type PatternContent,
  type PatternMetadata,
  type StitchData,
  type Viewport
} from "@stitchharbor/types";

import { cellKey, clampZoom, normalizeRect } from "@/lib/editor/geometry";

export type EditorTool = "stitch" | "backstitch" | "knot" | "eraser" | "select" | "pan";

export type SelectionRect = {
  start: GridCoord;
  end: GridCoord;
};

export type EditorPatternState = {
  pattern: PatternContent;
  metadata: PatternMetadata;
  loadPattern: (pattern: PatternContent, metadata: PatternMetadata) => void;
  placeStitch: (x: number, y: number) => void;
  removeStitch: (x: number, y: number) => void;
  removeSelectedStitches: (keys: string[]) => void;
  fillSelection: (keys: string[]) => void;
  placeBackstitch: (x1: number, y1: number, x2: number, y2: number) => void;
  placeKnot: (x: number, y: number) => void;
  addPaletteColor: (color: `#${string}`, name?: string) => void;
  updatePaletteColor: (paletteIndex: number, color: `#${string}`) => void;
  renamePaletteColor: (paletteIndex: number, name: string) => void;
  removePaletteColor: (paletteIndex: number) => void;
  loadBenchmarkPattern: () => void;
  setFrameType: (frameType: FrameType) => void;
  setFrameParam: (param: string, value: number) => void;
  setPatternVisibility: (isPublic: boolean) => void;
};

export type EditorUiState = {
  viewport: Viewport;
  activeTool: EditorTool;
  activeStitchType: StitchType;
  activePaletteIndex: number;
  selectedCells: string[];
  hoverCell: GridCoord | null;
  selectionRect: SelectionRect | null;
  pendingBackstitchStart: GridCoord | null;
  lastRenderMs: number | null;
  setTool: (tool: EditorTool) => void;
  setActiveStitchType: (stitchType: StitchType) => void;
  setActivePaletteIndex: (paletteIndex: number) => void;
  setHoverCell: (coord: GridCoord | null) => void;
  setSelectionRect: (rect: SelectionRect | null) => void;
  setPendingBackstitchStart: (coord: GridCoord | null) => void;
  setSelectedCells: (keys: string[]) => void;
  toggleSelectedCell: (key: string) => void;
  clearSelection: () => void;
  pan: (dx: number, dy: number) => void;
  setZoom: (zoom: number) => void;
  zoomAt: (zoom: number, screenX: number, screenY: number) => void;
  setLastRenderMs: (ms: number) => void;
};

const initialPalette: PaletteEntry[] = [
  { id: 0, color: "#0f766e", name: "Harbor Teal", symbol: "X" },
  { id: 1, color: "#e76f51", name: "Coral", symbol: "O" },
  { id: 2, color: "#f2cc8f", name: "Sand", symbol: "/" }
];

const initialFrame: FrameConfig = { type: "none" };

const initialPattern: PatternContent = {
  version: EMPTY_PATTERN_CONTENT.version,
  palette: initialPalette,
  stitches: [],
  backstitches: [],
  knots: []
};

const initialMetadata: PatternMetadata = {
  id: "local-draft",
  userId: "local-user",
  title: "Untitled Pattern",
  description: null,
  isPublic: true,
  gridWidth: 80,
  gridHeight: 60,
  fabricCount: 14,
  frame: initialFrame,
  stitchCount: 0,
  colorCount: initialPalette.length,
  thumbnailUrl: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z")
};

const symbols = ["X", "O", "/", "\\", "+", "●", "▲", "◆", "□", "◇", "★", "✕"];

export const useEditorPatternStore = create<EditorPatternState>()(
  travel(
    (set) => ({
      pattern: initialPattern,
      metadata: initialMetadata,
      loadPattern: (pattern, metadata) => {
        set({ pattern, metadata });
        useEditorPatternStore.getControls?.()?.rebase();
        useEditorUiStore.getState().clearSelection();
      },
      placeStitch: (x, y) =>
        set((state) => {
          if (!isWithinGrid(x, y, state.metadata)) return;

          const paletteIndex = useEditorUiStore.getState().activePaletteIndex;
          const stitchType = useEditorUiStore.getState().activeStitchType;
          const nextStitch: StitchData = { x, y, p: paletteIndex, t: stitchType };
          const index = state.pattern.stitches.findIndex((stitch) => stitch.x === x && stitch.y === y);

          if (index >= 0) {
            state.pattern.stitches[index] = nextStitch;
          } else {
            state.pattern.stitches.push(nextStitch);
          }

          updateMetadataCounts(state);
        }),
      removeStitch: (x, y) =>
        set((state) => {
          state.pattern.stitches = state.pattern.stitches.filter((stitch) => stitch.x !== x || stitch.y !== y);
          updateMetadataCounts(state);
        }),
      removeSelectedStitches: (keys) =>
        set((state) => {
          const selected = new Set(keys);
          state.pattern.stitches = state.pattern.stitches.filter((stitch) => !selected.has(cellKey(stitch.x, stitch.y)));
          updateMetadataCounts(state);
        }),
      fillSelection: (keys) =>
        set((state) => {
          const paletteIndex = useEditorUiStore.getState().activePaletteIndex;
          const stitchType = useEditorUiStore.getState().activeStitchType;

          for (const key of keys) {
            const [xRaw, yRaw] = key.split(",");
            const x = Number(xRaw);
            const y = Number(yRaw);
            if (!isWithinGrid(x, y, state.metadata)) continue;

            const index = state.pattern.stitches.findIndex((stitch) => stitch.x === x && stitch.y === y);
            const nextStitch: StitchData = { x, y, p: paletteIndex, t: stitchType };
            if (index >= 0) {
              state.pattern.stitches[index] = nextStitch;
            } else {
              state.pattern.stitches.push(nextStitch);
            }
          }

          updateMetadataCounts(state);
        }),
      placeBackstitch: (x1, y1, x2, y2) =>
        set((state) => {
          const backstitch: BackstitchData = {
            x1,
            y1,
            x2,
            y2,
            p: useEditorUiStore.getState().activePaletteIndex
          };
          state.pattern.backstitches.push(backstitch);
          updateMetadataCounts(state);
        }),
      placeKnot: (x, y) =>
        set((state) => {
          const knot: KnotData = {
            x,
            y,
            p: useEditorUiStore.getState().activePaletteIndex
          };
          state.pattern.knots.push(knot);
          updateMetadataCounts(state);
        }),
      addPaletteColor: (color, name) =>
        set((state) => {
          const id = state.pattern.palette.length
            ? Math.max(...state.pattern.palette.map((entry) => entry.id)) + 1
            : 0;
          state.pattern.palette.push({
            id,
            color,
            name: name || `Color ${id + 1}`,
            symbol: symbols[id % symbols.length] ?? "X"
          });
          updateMetadataCounts(state);
          useEditorUiStore.getState().setActivePaletteIndex(state.pattern.palette.length - 1);
        }),
      updatePaletteColor: (paletteIndex, color) =>
        set((state) => {
          if (state.pattern.palette[paletteIndex]) {
            state.pattern.palette[paletteIndex].color = color;
          }
        }),
      renamePaletteColor: (paletteIndex, name) =>
        set((state) => {
          if (state.pattern.palette[paletteIndex]) {
            state.pattern.palette[paletteIndex].name = name;
          }
        }),
      removePaletteColor: (paletteIndex) =>
        set((state) => {
          if (state.pattern.palette.length <= 1) return;

          state.pattern.palette.splice(paletteIndex, 1);
          state.pattern.stitches = state.pattern.stitches
            .filter((stitch) => stitch.p !== paletteIndex)
            .map((stitch) => ({ ...stitch, p: stitch.p > paletteIndex ? stitch.p - 1 : stitch.p }));
          state.pattern.backstitches = state.pattern.backstitches
            .filter((stitch) => stitch.p !== paletteIndex)
            .map((stitch) => ({ ...stitch, p: stitch.p > paletteIndex ? stitch.p - 1 : stitch.p }));
          state.pattern.knots = state.pattern.knots
            .filter((knot) => knot.p !== paletteIndex)
            .map((knot) => ({ ...knot, p: knot.p > paletteIndex ? knot.p - 1 : knot.p }));
          updateMetadataCounts(state);
          useEditorUiStore.getState().setActivePaletteIndex(0);
        }),
      loadBenchmarkPattern: () =>
        set((state) => {
          const width = 500;
          const height = 200;
          const stitches: StitchData[] = [];

          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              stitches.push({
                x,
                y,
                p: (x + y) % state.pattern.palette.length,
                t: StitchType.Full
              });
            }
          }

          state.metadata.gridWidth = width;
          state.metadata.gridHeight = height;
          state.pattern.stitches = stitches;
          state.pattern.backstitches = [];
          state.pattern.knots = [];
          updateMetadataCounts(state);
          useEditorUiStore.getState().clearSelection();
        }),
      setFrameType: (frameType) =>
        set((state) => {
          state.metadata.frame = createDefaultFrame(frameType, state.metadata);
          state.metadata.updatedAt = new Date();
        }),
      setFrameParam: (param, value) =>
        set((state) => {
          if (state.metadata.frame.type === "none") return;
          const minValue = param === "x" || param === "y" ? 0 : 1;
          state.metadata.frame = {
            ...state.metadata.frame,
            [param]: Math.max(minValue, value)
          } as FrameConfig;
          state.metadata.updatedAt = new Date();
        }),
      setPatternVisibility: (isPublic) =>
        set((state) => {
          state.metadata.isPublic = isPublic;
          state.metadata.updatedAt = new Date();
        })
    }),
    { maxHistory: 500 }
  )
);

export const useEditorUiStore = create<EditorUiState>((set) => ({
  viewport: { offsetX: 0, offsetY: 0, zoom: 1 },
  activeTool: "stitch",
  activeStitchType: StitchType.Full,
  activePaletteIndex: 0,
  selectedCells: [],
  hoverCell: null,
  selectionRect: null,
  pendingBackstitchStart: null,
  lastRenderMs: null,
  setTool: (activeTool) => set({ activeTool }),
  setActiveStitchType: (activeStitchType) => set({ activeStitchType }),
  setActivePaletteIndex: (activePaletteIndex) => set({ activePaletteIndex }),
  setHoverCell: (hoverCell) => set({ hoverCell }),
  setSelectionRect: (selectionRect) => set({ selectionRect }),
  setPendingBackstitchStart: (pendingBackstitchStart) => set({ pendingBackstitchStart }),
  setSelectedCells: (selectedCells) => set({ selectedCells: dedupeKeys(selectedCells) }),
  toggleSelectedCell: (key) =>
    set((state) => ({
      selectedCells: state.selectedCells.includes(key)
        ? state.selectedCells.filter((selectedKey) => selectedKey !== key)
        : [...state.selectedCells, key]
    })),
  clearSelection: () => set({ selectedCells: [], selectionRect: null }),
  pan: (dx, dy) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        offsetX: Math.max(0, state.viewport.offsetX - dx / state.viewport.zoom),
        offsetY: Math.max(0, state.viewport.offsetY - dy / state.viewport.zoom)
      }
    })),
  setZoom: (zoom) =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: clampZoom(zoom)
      }
    })),
  zoomAt: (zoom, screenX, screenY) =>
    set((state) => {
      const nextZoom = clampZoom(zoom);
      const virtualX = screenX / state.viewport.zoom + state.viewport.offsetX;
      const virtualY = screenY / state.viewport.zoom + state.viewport.offsetY;

      return {
        viewport: {
          offsetX: Math.max(0, virtualX - screenX / nextZoom),
          offsetY: Math.max(0, virtualY - screenY / nextZoom),
          zoom: nextZoom
        }
      };
    }),
  setLastRenderMs: (lastRenderMs) => set({ lastRenderMs })
}));

export function undoPatternChange() {
  useEditorPatternStore.getControls?.()?.back();
}

export function redoPatternChange() {
  useEditorPatternStore.getControls?.()?.forward();
}

export function selectRectCells(start: GridCoord, end: GridCoord) {
  const { metadata } = useEditorPatternStore.getState();
  const rect = normalizeRect(start, end);
  const keys: string[] = [];

  for (let y = Math.max(0, rect.minY); y <= Math.min(metadata.gridHeight - 1, rect.maxY); y += 1) {
    for (let x = Math.max(0, rect.minX); x <= Math.min(metadata.gridWidth - 1, rect.maxX); x += 1) {
      keys.push(cellKey(x, y));
    }
  }

  useEditorUiStore.getState().setSelectedCells(keys);
}

function isWithinGrid(x: number, y: number, metadata: PatternMetadata) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < metadata.gridWidth && y < metadata.gridHeight;
}

function updateMetadataCounts(state: Pick<EditorPatternState, "metadata" | "pattern">) {
  state.metadata.stitchCount = state.pattern.stitches.length + state.pattern.backstitches.length + state.pattern.knots.length;
  state.metadata.colorCount = state.pattern.palette.length;
  state.metadata.updatedAt = new Date();
}

function dedupeKeys(keys: string[]) {
  return Array.from(new Set(keys));
}

function createDefaultFrame(frameType: FrameType, metadata: PatternMetadata): FrameConfig {
  const centerX = metadata.gridWidth / 2;
  const centerY = metadata.gridHeight / 2;

  switch (frameType) {
    case "circle":
      return {
        type: "circle",
        radius: Math.floor(Math.min(metadata.gridWidth, metadata.gridHeight) * 0.38),
        centerX,
        centerY
      };
    case "oval":
      return {
        type: "oval",
        width: Math.floor(metadata.gridWidth * 0.75),
        height: Math.floor(metadata.gridHeight * 0.68),
        centerX,
        centerY
      };
    case "rectangle":
      return {
        type: "rectangle",
        width: Math.floor(metadata.gridWidth * 0.75),
        height: Math.floor(metadata.gridHeight * 0.68),
        x: Math.floor(metadata.gridWidth * 0.125),
        y: Math.floor(metadata.gridHeight * 0.16)
      };
    case "none":
      return { type: "none" };
  }
}

export function getPaletteUsage(pattern: PatternContent) {
  const counts = new Map<number, number>();

  for (const stitch of pattern.stitches) {
    counts.set(stitch.p, (counts.get(stitch.p) ?? 0) + 1);
  }

  for (const backstitch of pattern.backstitches) {
    counts.set(backstitch.p, (counts.get(backstitch.p) ?? 0) + 1);
  }

  for (const knot of pattern.knots) {
    counts.set(knot.p, (counts.get(knot.p) ?? 0) + 1);
  }

  return counts;
}
