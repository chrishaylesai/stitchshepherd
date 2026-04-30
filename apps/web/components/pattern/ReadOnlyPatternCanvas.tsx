"use client";

import { useEffect, useRef, useState } from "react";

import type { PatternContent, PatternMetadata, Viewport } from "@stitchharbor/types";

import { renderFrameLayer, renderGridLayer, renderStitchLayer } from "@/components/editor/renderers";
import { getCellSize, resizeCanvasToDisplaySize, type CanvasSize } from "@/lib/editor/geometry";

type ReadOnlyPatternCanvasProps = {
  content: PatternContent;
  metadata: PatternMetadata;
};

export function ReadOnlyPatternCanvas({ content, metadata }: ReadOnlyPatternCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stitchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 1, height: 1 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const stitchCanvas = stitchCanvasRef.current;
    const frameCanvas = frameCanvasRef.current;
    if (!gridCanvas || !stitchCanvas || !frameCanvas) return;

    const gridCtx = resizeCanvasToDisplaySize(gridCanvas, size.width, size.height);
    const stitchCtx = resizeCanvasToDisplaySize(stitchCanvas, size.width, size.height);
    const frameCtx = resizeCanvasToDisplaySize(frameCanvas, size.width, size.height);
    if (!gridCtx || !stitchCtx || !frameCtx) return;

    const viewport = getFitViewport(size, metadata);
    renderGridLayer(gridCtx, size, viewport, metadata);
    renderStitchLayer(stitchCtx, size, viewport, metadata, content);
    renderFrameLayer(frameCtx, size, viewport, metadata);
  }, [content, metadata, size]);

  return (
    <div
      aria-label={`${metadata.title} pattern preview`}
      className="relative h-[min(72vh,720px)] min-h-[320px] overflow-hidden rounded-lg border bg-[#f4ecd9]"
      ref={containerRef}
      role="img"
    >
      <canvas className="absolute inset-0" ref={gridCanvasRef} />
      <canvas className="absolute inset-0" ref={stitchCanvasRef} />
      <canvas className="absolute inset-0" ref={frameCanvasRef} />
    </div>
  );
}

function getFitViewport(size: CanvasSize, metadata: PatternMetadata): Viewport {
  const cellSize = getCellSize(metadata.fabricCount);
  const patternWidth = metadata.gridWidth * cellSize;
  const patternHeight = metadata.gridHeight * cellSize;
  const padding = 32;
  const zoom = Math.min(size.width / (patternWidth + padding * 2), size.height / (patternHeight + padding * 2));
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const visibleWidth = size.width / safeZoom;
  const visibleHeight = size.height / safeZoom;

  return {
    offsetX: -(visibleWidth - patternWidth) / 2,
    offsetY: -(visibleHeight - patternHeight) / 2,
    zoom: safeZoom
  };
}
