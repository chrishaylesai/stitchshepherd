import { StitchType, type GridCoord, type PatternContent, type PatternMetadata, type Viewport } from "@stitchharbor/types";

import { getCellSize, normalizeRect, parseCellKey, type CanvasSize } from "@/lib/editor/geometry";

type SelectionRect = {
  start: GridCoord;
  end: GridCoord;
};

export type RenderSelectionState = {
  selectedCells: string[];
  hoverCell: GridCoord | null;
  selectionRect: SelectionRect | null;
  pendingBackstitchStart: GridCoord | null;
};

export function renderGridLayer(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  viewport: Viewport,
  metadata: PatternMetadata
) {
  const cellSize = getCellSize(metadata.fabricCount);
  clearCanvas(ctx, size);
  ctx.fillStyle = "#f4ecd9";
  ctx.fillRect(0, 0, size.width, size.height);

  withViewport(ctx, viewport, () => {
    const virtual = getVisibleVirtualBounds(size, viewport);
    const startCol = Math.max(0, Math.floor(virtual.minX / cellSize));
    const endCol = Math.min(metadata.gridWidth, Math.ceil(virtual.maxX / cellSize));
    const startRow = Math.max(0, Math.floor(virtual.minY / cellSize));
    const endRow = Math.min(metadata.gridHeight, Math.ceil(virtual.maxY / cellSize));

    ctx.lineWidth = 1 / viewport.zoom;

    for (let col = startCol; col <= endCol; col += 1) {
      ctx.beginPath();
      ctx.strokeStyle = col % 10 === 0 ? "rgba(15, 118, 110, 0.35)" : "rgba(74, 64, 49, 0.18)";
      const x = col * cellSize;
      ctx.moveTo(x, startRow * cellSize);
      ctx.lineTo(x, endRow * cellSize);
      ctx.stroke();
    }

    for (let row = startRow; row <= endRow; row += 1) {
      ctx.beginPath();
      ctx.strokeStyle = row % 10 === 0 ? "rgba(15, 118, 110, 0.35)" : "rgba(74, 64, 49, 0.18)";
      const y = row * cellSize;
      ctx.moveTo(startCol * cellSize, y);
      ctx.lineTo(endCol * cellSize, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.strokeRect(0, 0, metadata.gridWidth * cellSize, metadata.gridHeight * cellSize);
  });
}

export function renderStitchLayer(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  viewport: Viewport,
  metadata: PatternMetadata,
  pattern: PatternContent
) {
  const start = performance.now();
  const cellSize = getCellSize(metadata.fabricCount);
  const virtual = getVisibleVirtualBounds(size, viewport);
  const visible = {
    minX: Math.floor(virtual.minX / cellSize) - 1,
    maxX: Math.ceil(virtual.maxX / cellSize) + 1,
    minY: Math.floor(virtual.minY / cellSize) - 1,
    maxY: Math.ceil(virtual.maxY / cellSize) + 1
  };

  clearCanvas(ctx, size);

  withViewport(ctx, viewport, () => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, cellSize * 0.13);

    for (let paletteIndex = 0; paletteIndex < pattern.palette.length; paletteIndex += 1) {
      const paletteEntry = pattern.palette[paletteIndex];
      if (!paletteEntry) continue;

      ctx.beginPath();
      ctx.strokeStyle = paletteEntry.color;

      for (const stitch of pattern.stitches) {
        if (stitch.p !== paletteIndex || !isVisibleCell(stitch.x, stitch.y, visible)) continue;
        addStitchPath(ctx, stitch.x, stitch.y, stitch.t, cellSize);
      }

      ctx.stroke();
    }

    for (const backstitch of pattern.backstitches) {
      const color = pattern.palette[backstitch.p]?.color ?? "#111827";
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, cellSize * 0.08);
      ctx.moveTo(backstitch.x1 * cellSize, backstitch.y1 * cellSize);
      ctx.lineTo(backstitch.x2 * cellSize, backstitch.y2 * cellSize);
      ctx.stroke();
    }

    for (const knot of pattern.knots) {
      if (!isVisibleCell(Math.floor(knot.x), Math.floor(knot.y), visible)) continue;
      const color = pattern.palette[knot.p]?.color ?? "#111827";
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(knot.x * cellSize, knot.y * cellSize, Math.max(2, cellSize * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return performance.now() - start;
}

export function renderSelectionLayer(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  viewport: Viewport,
  metadata: PatternMetadata,
  selection: RenderSelectionState
) {
  const cellSize = getCellSize(metadata.fabricCount);
  clearCanvas(ctx, size);

  withViewport(ctx, viewport, () => {
    ctx.lineWidth = 2 / viewport.zoom;

    for (const key of selection.selectedCells) {
      const coord = parseCellKey(key);
      drawCellOverlay(ctx, coord.x, coord.y, cellSize, "rgba(231, 111, 81, 0.22)", "rgba(231, 111, 81, 0.85)");
    }

    if (selection.hoverCell) {
      drawCellOverlay(
        ctx,
        selection.hoverCell.x,
        selection.hoverCell.y,
        cellSize,
        "rgba(15, 118, 110, 0.12)",
        "rgba(15, 118, 110, 0.8)"
      );
    }

    if (selection.selectionRect) {
      const rect = normalizeRect(selection.selectionRect.start, selection.selectionRect.end);
      ctx.fillStyle = "rgba(15, 118, 110, 0.14)";
      ctx.strokeStyle = "rgba(15, 118, 110, 0.8)";
      ctx.fillRect(rect.minX * cellSize, rect.minY * cellSize, (rect.maxX - rect.minX + 1) * cellSize, (rect.maxY - rect.minY + 1) * cellSize);
      ctx.strokeRect(rect.minX * cellSize, rect.minY * cellSize, (rect.maxX - rect.minX + 1) * cellSize, (rect.maxY - rect.minY + 1) * cellSize);
    }

    if (selection.pendingBackstitchStart) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(17, 24, 39, 0.8)";
      ctx.arc(selection.pendingBackstitchStart.x * cellSize, selection.pendingBackstitchStart.y * cellSize, 4 / viewport.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function renderFrameLayer(ctx: CanvasRenderingContext2D, size: CanvasSize, viewport: Viewport, metadata: PatternMetadata) {
  const cellSize = getCellSize(metadata.fabricCount);
  clearCanvas(ctx, size);

  if (metadata.frame.type === "none") {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(38, 30, 22, 0.38)";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.globalCompositeOperation = "destination-out";
  withViewport(ctx, viewport, () => {
    ctx.beginPath();
    addFramePath(ctx, metadata, cellSize);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();

  withViewport(ctx, viewport, () => {
    ctx.beginPath();
    addFramePath(ctx, metadata, cellSize);
    ctx.strokeStyle = "rgba(91, 60, 31, 0.95)";
    ctx.lineWidth = Math.max(5 / viewport.zoom, cellSize * 0.12);
    ctx.stroke();

    ctx.beginPath();
    addFramePath(ctx, metadata, cellSize);
    ctx.strokeStyle = "rgba(242, 204, 143, 0.95)";
    ctx.lineWidth = Math.max(2 / viewport.zoom, cellSize * 0.04);
    ctx.stroke();
  });
}

function addStitchPath(ctx: CanvasRenderingContext2D, x: number, y: number, stitchType: StitchType, cellSize: number) {
  const left = x * cellSize;
  const top = y * cellSize;
  const right = left + cellSize;
  const bottom = top + cellSize;
  const centerX = left + cellSize / 2;
  const centerY = top + cellSize / 2;

  switch (stitchType) {
    case StitchType.Full:
      diagonal(ctx, left, top, right, bottom);
      diagonal(ctx, left, bottom, right, top);
      break;
    case StitchType.HalfTopLeftToBottomRight:
      diagonal(ctx, left, top, right, bottom);
      break;
    case StitchType.HalfBottomLeftToTopRight:
      diagonal(ctx, left, bottom, right, top);
      break;
    case StitchType.QuarterTopLeft:
      diagonal(ctx, left, top, centerX, centerY);
      break;
    case StitchType.QuarterTopRight:
      diagonal(ctx, right, top, centerX, centerY);
      break;
    case StitchType.QuarterBottomLeft:
      diagonal(ctx, left, bottom, centerX, centerY);
      break;
    case StitchType.QuarterBottomRight:
      diagonal(ctx, right, bottom, centerX, centerY);
      break;
    case StitchType.ThreeQuarterTopLeft:
      diagonal(ctx, left, top, right, bottom);
      diagonal(ctx, left, bottom, centerX, centerY);
      break;
    case StitchType.ThreeQuarterTopRight:
      diagonal(ctx, left, bottom, right, top);
      diagonal(ctx, left, top, centerX, centerY);
      break;
    case StitchType.ThreeQuarterBottomLeft:
      diagonal(ctx, left, bottom, right, top);
      diagonal(ctx, right, bottom, centerX, centerY);
      break;
    case StitchType.ThreeQuarterBottomRight:
      diagonal(ctx, left, top, right, bottom);
      diagonal(ctx, right, top, centerX, centerY);
      break;
  }
}

function diagonal(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function drawCellOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  fillStyle: string,
  strokeStyle: string
) {
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
  ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
}

function addFramePath(ctx: CanvasRenderingContext2D, metadata: PatternMetadata, cellSize: number) {
  const frame = metadata.frame;

  switch (frame.type) {
    case "circle": {
      const centerX = (frame.centerX ?? metadata.gridWidth / 2) * cellSize;
      const centerY = (frame.centerY ?? metadata.gridHeight / 2) * cellSize;
      ctx.arc(centerX, centerY, frame.radius * cellSize, 0, Math.PI * 2);
      break;
    }
    case "oval": {
      const centerX = (frame.centerX ?? metadata.gridWidth / 2) * cellSize;
      const centerY = (frame.centerY ?? metadata.gridHeight / 2) * cellSize;
      ctx.ellipse(centerX, centerY, (frame.width * cellSize) / 2, (frame.height * cellSize) / 2, 0, 0, Math.PI * 2);
      break;
    }
    case "rectangle": {
      const x = (frame.x ?? (metadata.gridWidth - frame.width) / 2) * cellSize;
      const y = (frame.y ?? (metadata.gridHeight - frame.height) / 2) * cellSize;
      ctx.rect(x, y, frame.width * cellSize, frame.height * cellSize);
      break;
    }
    case "none":
      break;
  }
}

function withViewport(ctx: CanvasRenderingContext2D, viewport: Viewport, draw: () => void) {
  ctx.save();
  ctx.translate(-viewport.offsetX * viewport.zoom, -viewport.offsetY * viewport.zoom);
  ctx.scale(viewport.zoom, viewport.zoom);
  draw();
  ctx.restore();
}

function clearCanvas(ctx: CanvasRenderingContext2D, size: CanvasSize) {
  ctx.clearRect(0, 0, size.width, size.height);
}

function getVisibleVirtualBounds(size: CanvasSize, viewport: Viewport) {
  return {
    minX: viewport.offsetX,
    minY: viewport.offsetY,
    maxX: viewport.offsetX + size.width / viewport.zoom,
    maxY: viewport.offsetY + size.height / viewport.zoom
  };
}

function isVisibleCell(
  x: number,
  y: number,
  visible: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }
) {
  return x >= visible.minX && x <= visible.maxX && y >= visible.minY && y <= visible.maxY;
}
