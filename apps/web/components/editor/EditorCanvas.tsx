"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

import { cellKey, getCellSize, resizeCanvasToDisplaySize, screenToGrid, screenToGridPoint } from "@/lib/editor/geometry";
import {
  redoPatternChange,
  selectRectCells,
  undoPatternChange,
  useEditorPatternStore,
  useEditorUiStore
} from "@/stores/editorStore";

import { renderFrameLayer, renderGridLayer, renderSelectionLayer, renderStitchLayer } from "./renderers";

type DragState =
  | {
      mode: "paint" | "erase";
    }
  | {
      mode: "pan";
      x: number;
      y: number;
    }
  | {
      mode: "select";
      start: { x: number; y: number };
    }
  | null;

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLCanvasElement | null>(null);
  const stitchesRef = useRef<HTMLCanvasElement | null>(null);
  const selectionRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const spacePressedRef = useRef(false);
  const [size, setSize] = useState({ width: 900, height: 640 });

  const pattern = useEditorPatternStore((state) => state.pattern);
  const metadata = useEditorPatternStore((state) => state.metadata);
  const placeStitch = useEditorPatternStore((state) => state.placeStitch);
  const removeStitch = useEditorPatternStore((state) => state.removeStitch);
  const placeBackstitch = useEditorPatternStore((state) => state.placeBackstitch);
  const placeKnot = useEditorPatternStore((state) => state.placeKnot);

  const viewport = useEditorUiStore((state) => state.viewport);
  const activeTool = useEditorUiStore((state) => state.activeTool);
  const selectedCells = useEditorUiStore((state) => state.selectedCells);
  const hoverCell = useEditorUiStore((state) => state.hoverCell);
  const selectionRect = useEditorUiStore((state) => state.selectionRect);
  const pendingBackstitchStart = useEditorUiStore((state) => state.pendingBackstitchStart);

  const setHoverCell = useEditorUiStore((state) => state.setHoverCell);
  const setSelectionRect = useEditorUiStore((state) => state.setSelectionRect);
  const setSelectedCells = useEditorUiStore((state) => state.setSelectedCells);
  const toggleSelectedCell = useEditorUiStore((state) => state.toggleSelectedCell);
  const clearSelection = useEditorUiStore((state) => state.clearSelection);
  const pan = useEditorUiStore((state) => state.pan);
  const zoomAt = useEditorUiStore((state) => state.zoomAt);
  const setZoom = useEditorUiStore((state) => state.setZoom);
  const setPendingBackstitchStart = useEditorUiStore((state) => state.setPendingBackstitchStart);
  const setLastRenderMs = useEditorUiStore((state) => state.setLastRenderMs);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height)
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvases = [gridRef.current, stitchesRef.current, selectionRef.current, frameRef.current];
    for (const canvas of canvases) {
      if (canvas) resizeCanvasToDisplaySize(canvas, size.width, size.height);
    }
  }, [size]);

  useEffect(() => {
    const ctx = gridRef.current ? resizeCanvasToDisplaySize(gridRef.current, size.width, size.height) : null;
    if (!ctx) return;
    renderGridLayer(ctx, size, viewport, metadata);
  }, [metadata, size, viewport]);

  useEffect(() => {
    const ctx = stitchesRef.current ? resizeCanvasToDisplaySize(stitchesRef.current, size.width, size.height) : null;
    if (!ctx) return;

    const frame = requestAnimationFrame(() => {
      const renderMs = renderStitchLayer(ctx, size, viewport, metadata, pattern);
      setLastRenderMs(renderMs);
    });

    return () => cancelAnimationFrame(frame);
  }, [metadata, pattern, setLastRenderMs, size, viewport]);

  useEffect(() => {
    const ctx = selectionRef.current ? resizeCanvasToDisplaySize(selectionRef.current, size.width, size.height) : null;
    if (!ctx) return;

    renderSelectionLayer(ctx, size, viewport, metadata, {
      selectedCells,
      hoverCell,
      selectionRect,
      pendingBackstitchStart
    });
  }, [hoverCell, metadata, pendingBackstitchStart, selectedCells, selectionRect, size, viewport]);

  useEffect(() => {
    const ctx = frameRef.current ? resizeCanvasToDisplaySize(frameRef.current, size.width, size.height) : null;
    if (!ctx) return;
    renderFrameLayer(ctx, size, viewport, metadata);
  }, [metadata, size, viewport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePressedRef.current = true;
        event.preventDefault();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoPatternChange();
        } else {
          undoPatternChange();
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoPatternChange();
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom(useEditorUiStore.getState().viewport.zoom * 1.1);
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom(useEditorUiStore.getState().viewport.zoom / 1.1);
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        useEditorPatternStore.getState().removeSelectedStitches(useEditorUiStore.getState().selectedCells);
        clearSelection();
      }

      if (event.key === "Escape") {
        clearSelection();
        setPendingBackstitchStart(null);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        spacePressedRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [clearSelection, setPendingBackstitchStart, setZoom]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[520px] overflow-hidden rounded-3xl border bg-card shadow-inner"
      onContextMenu={(event) => event.preventDefault()}
    >
      <canvas ref={gridRef} className="absolute inset-0" aria-hidden="true" />
      <canvas ref={stitchesRef} className="absolute inset-0" aria-hidden="true" />
      <canvas ref={selectionRef} className="absolute inset-0" aria-hidden="true" />
      <canvas
        ref={frameRef}
        className="absolute inset-0 cursor-crosshair touch-none outline-none"
        role="application"
        aria-label="Cross-stitch pattern editor canvas"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
        Zoom {(viewport.zoom * 100).toFixed(0)}% · Offset {viewport.offsetX.toFixed(0)}, {viewport.offsetY.toFixed(0)}
      </div>
    </div>
  );

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getLocalPoint(event);
    const shouldPan = event.button === 1 || activeTool === "pan" || spacePressedRef.current;

    if (shouldPan) {
      dragRef.current = { mode: "pan", x: point.x, y: point.y };
      return;
    }

    if (activeTool === "stitch") {
      dragRef.current = { mode: "paint" };
      const coord = getCell(point.x, point.y);
      placeStitch(coord.x, coord.y);
      return;
    }

    if (activeTool === "eraser") {
      dragRef.current = { mode: "erase" };
      const coord = getCell(point.x, point.y);
      removeStitch(coord.x, coord.y);
      return;
    }

    if (activeTool === "knot") {
      const coord = getGridPoint(point.x, point.y);
      placeKnot(coord.x, coord.y);
      return;
    }

    if (activeTool === "backstitch") {
      const coord = getGridPoint(point.x, point.y);
      const pending = useEditorUiStore.getState().pendingBackstitchStart;
      if (pending) {
        placeBackstitch(pending.x, pending.y, coord.x, coord.y);
        setPendingBackstitchStart(null);
      } else {
        setPendingBackstitchStart(coord);
      }
      return;
    }

    if (activeTool === "select") {
      const coord = getCell(point.x, point.y);
      dragRef.current = { mode: "select", start: coord };
      setSelectionRect({ start: coord, end: coord });
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = getLocalPoint(event);
    const coord = getCell(point.x, point.y);
    setHoverCell(coord);

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "pan") {
      pan(point.x - drag.x, point.y - drag.y);
      drag.x = point.x;
      drag.y = point.y;
      return;
    }

    if (drag.mode === "paint") {
      placeStitch(coord.x, coord.y);
      return;
    }

    if (drag.mode === "erase") {
      removeStitch(coord.x, coord.y);
      return;
    }

    if (drag.mode === "select") {
      setSelectionRect({ start: drag.start, end: coord });
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const point = getLocalPoint(event);
    const drag = dragRef.current;
    dragRef.current = null;

    if (drag?.mode !== "select") {
      return;
    }

    const end = getCell(point.x, point.y);
    const startKey = cellKey(drag.start.x, drag.start.y);
    if (drag.start.x === end.x && drag.start.y === end.y) {
      setSelectionRect(null);
      if (event.shiftKey) {
        toggleSelectedCell(startKey);
      } else {
        setSelectedCells([startKey]);
      }
      return;
    }

    selectRectCells(drag.start, end);
    setSelectionRect(null);
  }

  function handlePointerLeave() {
    setHoverCell(null);
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const point = getLocalPoint(event);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(viewport.zoom * zoomFactor, point.x, point.y);
  }

  function getLocalPoint(event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function getCell(x: number, y: number) {
    return screenToGrid(x, y, useEditorUiStore.getState().viewport, getCellSize(metadata.fabricCount));
  }

  function getGridPoint(x: number, y: number) {
    return screenToGridPoint(x, y, useEditorUiStore.getState().viewport, getCellSize(metadata.fabricCount));
  }
}
