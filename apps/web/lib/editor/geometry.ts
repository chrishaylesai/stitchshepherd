import type { GridCoord, Viewport } from "@stitchharbor/types";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export type CanvasSize = {
  width: number;
  height: number;
};

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function getCellSize(fabricCount: number) {
  return Math.max(8, Math.round(280 / fabricCount));
}

export function screenToVirtual(screenX: number, screenY: number, viewport: Viewport) {
  return {
    x: screenX / viewport.zoom + viewport.offsetX,
    y: screenY / viewport.zoom + viewport.offsetY
  };
}

export function screenToGrid(screenX: number, screenY: number, viewport: Viewport, cellSize: number): GridCoord {
  const virtual = screenToVirtual(screenX, screenY, viewport);

  return {
    x: Math.floor(virtual.x / cellSize),
    y: Math.floor(virtual.y / cellSize)
  };
}

export function screenToGridPoint(screenX: number, screenY: number, viewport: Viewport, cellSize: number): GridCoord {
  const virtual = screenToVirtual(screenX, screenY, viewport);

  return {
    x: Math.round(virtual.x / cellSize),
    y: Math.round(virtual.y / cellSize)
  };
}

export function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function parseCellKey(key: string): GridCoord {
  const [x = "0", y = "0"] = key.split(",");

  return {
    x: Number(x),
    y: Number(y)
  };
}

export function normalizeRect(start: GridCoord, end: GridCoord) {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y)
  };
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  const nextWidth = Math.max(1, Math.floor(width * dpr));
  const nextHeight = Math.max(1, Math.floor(height * dpr));

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  return ctx;
}
