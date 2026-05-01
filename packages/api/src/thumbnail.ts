import { deflateSync } from "node:zlib";

import { StitchType, type FrameConfig, type PatternContent } from "@stitchharbor/types";

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 240;
const THUMBNAIL_PADDING = 16;

type ThumbnailMetadata = {
  gridWidth: number;
  gridHeight: number;
  frame: FrameConfig;
};

type Fit = ReturnType<typeof getFit>;

type Point = {
  x: number;
  y: number;
};

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export async function renderPatternThumbnail(metadata: ThumbnailMetadata, pattern: PatternContent) {
  const image = createImage(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, parseHexColor("#f8fafc"));
  const fit = getFit(metadata);

  fillRect(image, fit.x, fit.y, fit.width, fit.height, parseHexColor("#f4ecd9"));
  renderGrid(image, fit, metadata);
  renderStitches(image, fit, pattern);
  renderBackstitches(image, fit, pattern);
  renderKnots(image, fit, pattern);
  renderFrame(image, fit, metadata);
  strokeRect(image, fit.x, fit.y, fit.width, fit.height, { ...parseHexColor("#0f172a"), a: 0.45 }, 1);

  return encodePng(image);
}

function getFit(metadata: ThumbnailMetadata) {
  const safeGridWidth = Math.max(1, metadata.gridWidth);
  const safeGridHeight = Math.max(1, metadata.gridHeight);
  const cellSize = Math.min(
    (THUMBNAIL_WIDTH - THUMBNAIL_PADDING * 2) / safeGridWidth,
    (THUMBNAIL_HEIGHT - THUMBNAIL_PADDING * 2) / safeGridHeight
  );
  const width = safeGridWidth * cellSize;
  const height = safeGridHeight * cellSize;

  return {
    x: (THUMBNAIL_WIDTH - width) / 2,
    y: (THUMBNAIL_HEIGHT - height) / 2,
    width,
    height,
    cellSize
  };
}

function renderGrid(image: ImageBuffer, fit: Fit, metadata: ThumbnailMetadata) {
  const minorColor = { ...parseHexColor("#4a4031"), a: 0.16 };
  const majorColor = { ...parseHexColor("#0f766e"), a: 0.28 };

  if (fit.cellSize >= 4) {
    for (let col = 1; col < metadata.gridWidth; col += 1) {
      if (col % 10 === 0) continue;
      const x = fit.x + col * fit.cellSize;
      drawLine(image, x, fit.y, x, fit.y + fit.height, minorColor, 0.6);
    }

    for (let row = 1; row < metadata.gridHeight; row += 1) {
      if (row % 10 === 0) continue;
      const y = fit.y + row * fit.cellSize;
      drawLine(image, fit.x, y, fit.x + fit.width, y, minorColor, 0.6);
    }
  }

  if (fit.cellSize >= 1.2) {
    for (let col = 10; col < metadata.gridWidth; col += 10) {
      const x = fit.x + col * fit.cellSize;
      drawLine(image, x, fit.y, x, fit.y + fit.height, majorColor, 0.9);
    }

    for (let row = 10; row < metadata.gridHeight; row += 10) {
      const y = fit.y + row * fit.cellSize;
      drawLine(image, fit.x, y, fit.x + fit.width, y, majorColor, 0.9);
    }
  }
}

function renderStitches(image: ImageBuffer, fit: Fit, pattern: PatternContent) {
  const strokeWidth = Math.max(0.8, fit.cellSize * 0.13);

  for (const stitch of pattern.stitches) {
    addStitchPath(image, fit, stitch.x, stitch.y, stitch.t, parseHexColor(pattern.palette[stitch.p]?.color ?? "#111827"), strokeWidth);
  }
}

function renderBackstitches(image: ImageBuffer, fit: Fit, pattern: PatternContent) {
  const strokeWidth = Math.max(0.7, fit.cellSize * 0.08);

  for (const backstitch of pattern.backstitches) {
    const color = parseHexColor(pattern.palette[backstitch.p]?.color ?? "#111827");
    drawLine(
      image,
      fit.x + backstitch.x1 * fit.cellSize,
      fit.y + backstitch.y1 * fit.cellSize,
      fit.x + backstitch.x2 * fit.cellSize,
      fit.y + backstitch.y2 * fit.cellSize,
      color,
      strokeWidth
    );
  }
}

function renderKnots(image: ImageBuffer, fit: Fit, pattern: PatternContent) {
  const radius = Math.max(1, fit.cellSize * 0.18);

  for (const knot of pattern.knots) {
    fillCircle(image, fit.x + knot.x * fit.cellSize, fit.y + knot.y * fit.cellSize, radius, parseHexColor(pattern.palette[knot.p]?.color ?? "#111827"));
  }
}

function renderFrame(image: ImageBuffer, fit: Fit, metadata: ThumbnailMetadata) {
  if (metadata.frame.type === "none") return;

  const dim = { ...parseHexColor("#261e16"), a: 0.28 };

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!isInsideFrame(x + 0.5, y + 0.5, fit, metadata)) {
        blendPixel(image, x, y, dim);
      }
    }
  }

  strokeFrame(image, fit, metadata, { ...parseHexColor("#5b3c1f"), a: 0.95 }, 3);
  strokeFrame(image, fit, metadata, { ...parseHexColor("#f2cc8f"), a: 0.95 }, 1);
}

function addStitchPath(image: ImageBuffer, fit: Fit, x: number, y: number, stitchType: StitchType, color: Rgba, strokeWidth: number) {
  const left = fit.x + x * fit.cellSize;
  const top = fit.y + y * fit.cellSize;
  const right = left + fit.cellSize;
  const bottom = top + fit.cellSize;
  const centerX = left + fit.cellSize / 2;
  const centerY = top + fit.cellSize / 2;

  switch (stitchType) {
    case StitchType.Full:
      drawLine(image, left, top, right, bottom, color, strokeWidth);
      drawLine(image, left, bottom, right, top, color, strokeWidth);
      break;
    case StitchType.HalfTopLeftToBottomRight:
      drawLine(image, left, top, right, bottom, color, strokeWidth);
      break;
    case StitchType.HalfBottomLeftToTopRight:
      drawLine(image, left, bottom, right, top, color, strokeWidth);
      break;
    case StitchType.QuarterTopLeft:
      drawLine(image, left, top, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.QuarterTopRight:
      drawLine(image, right, top, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.QuarterBottomLeft:
      drawLine(image, left, bottom, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.QuarterBottomRight:
      drawLine(image, right, bottom, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.ThreeQuarterTopLeft:
      drawLine(image, left, top, right, bottom, color, strokeWidth);
      drawLine(image, left, bottom, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.ThreeQuarterTopRight:
      drawLine(image, left, bottom, right, top, color, strokeWidth);
      drawLine(image, left, top, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.ThreeQuarterBottomLeft:
      drawLine(image, left, bottom, right, top, color, strokeWidth);
      drawLine(image, right, bottom, centerX, centerY, color, strokeWidth);
      break;
    case StitchType.ThreeQuarterBottomRight:
      drawLine(image, left, top, right, bottom, color, strokeWidth);
      drawLine(image, right, top, centerX, centerY, color, strokeWidth);
      break;
  }
}

function isInsideFrame(x: number, y: number, fit: Fit, metadata: ThumbnailMetadata) {
  const frame = metadata.frame;

  switch (frame.type) {
    case "circle": {
      const center = getFrameCenter(fit, metadata, frame.centerX, frame.centerY);
      const radius = frame.radius * fit.cellSize;

      return distanceSquared(x, y, center.x, center.y) <= radius * radius;
    }
    case "oval": {
      const center = getFrameCenter(fit, metadata, frame.centerX, frame.centerY);
      const radiusX = (frame.width * fit.cellSize) / 2;
      const radiusY = (frame.height * fit.cellSize) / 2;

      return ((x - center.x) / radiusX) ** 2 + ((y - center.y) / radiusY) ** 2 <= 1;
    }
    case "rectangle": {
      const left = fit.x + (frame.x ?? (metadata.gridWidth - frame.width) / 2) * fit.cellSize;
      const top = fit.y + (frame.y ?? (metadata.gridHeight - frame.height) / 2) * fit.cellSize;

      return x >= left && x <= left + frame.width * fit.cellSize && y >= top && y <= top + frame.height * fit.cellSize;
    }
    case "none":
      return true;
  }
}

function strokeFrame(image: ImageBuffer, fit: Fit, metadata: ThumbnailMetadata, color: Rgba, strokeWidth: number) {
  const frame = metadata.frame;

  switch (frame.type) {
    case "circle": {
      const center = getFrameCenter(fit, metadata, frame.centerX, frame.centerY);
      strokeEllipse(image, center, frame.radius * fit.cellSize, frame.radius * fit.cellSize, color, strokeWidth);
      break;
    }
    case "oval": {
      const center = getFrameCenter(fit, metadata, frame.centerX, frame.centerY);
      strokeEllipse(image, center, (frame.width * fit.cellSize) / 2, (frame.height * fit.cellSize) / 2, color, strokeWidth);
      break;
    }
    case "rectangle": {
      const left = fit.x + (frame.x ?? (metadata.gridWidth - frame.width) / 2) * fit.cellSize;
      const top = fit.y + (frame.y ?? (metadata.gridHeight - frame.height) / 2) * fit.cellSize;

      strokeRect(image, left, top, frame.width * fit.cellSize, frame.height * fit.cellSize, color, strokeWidth);
      break;
    }
    case "none":
      break;
  }
}

function getFrameCenter(fit: Fit, metadata: ThumbnailMetadata, centerX?: number, centerY?: number) {
  return {
    x: fit.x + (centerX ?? metadata.gridWidth / 2) * fit.cellSize,
    y: fit.y + (centerY ?? metadata.gridHeight / 2) * fit.cellSize
  };
}

function strokeEllipse(image: ImageBuffer, center: Point, radiusX: number, radiusY: number, color: Rgba, strokeWidth: number) {
  const circumference = Math.max(16, Math.ceil(Math.PI * 2 * Math.max(radiusX, radiusY)));
  let previous = {
    x: center.x + radiusX,
    y: center.y
  };

  for (let index = 1; index <= circumference; index += 1) {
    const angle = (index / circumference) * Math.PI * 2;
    const next = {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    };

    drawLine(image, previous.x, previous.y, next.x, next.y, color, strokeWidth);
    previous = next;
  }
}

function strokeRect(image: ImageBuffer, x: number, y: number, width: number, height: number, color: Rgba, strokeWidth: number) {
  drawLine(image, x, y, x + width, y, color, strokeWidth);
  drawLine(image, x + width, y, x + width, y + height, color, strokeWidth);
  drawLine(image, x + width, y + height, x, y + height, color, strokeWidth);
  drawLine(image, x, y + height, x, y, color, strokeWidth);
}

function drawLine(image: ImageBuffer, x1: number, y1: number, x2: number, y2: number, color: Rgba, strokeWidth: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    fillCircle(image, x1 + dx * t, y1 + dy * t, strokeWidth / 2, color);
  }
}

function fillRect(image: ImageBuffer, x: number, y: number, width: number, height: number, color: Rgba) {
  const minX = clamp(Math.floor(x), 0, image.width);
  const maxX = clamp(Math.ceil(x + width), 0, image.width);
  const minY = clamp(Math.floor(y), 0, image.height);
  const maxY = clamp(Math.ceil(y + height), 0, image.height);

  for (let row = minY; row < maxY; row += 1) {
    for (let col = minX; col < maxX; col += 1) {
      blendPixel(image, col, row, color);
    }
  }
}

function fillCircle(image: ImageBuffer, centerX: number, centerY: number, radius: number, color: Rgba) {
  const safeRadius = Math.max(0.5, radius);
  const minX = clamp(Math.floor(centerX - safeRadius), 0, image.width - 1);
  const maxX = clamp(Math.ceil(centerX + safeRadius), 0, image.width - 1);
  const minY = clamp(Math.floor(centerY - safeRadius), 0, image.height - 1);
  const maxY = clamp(Math.ceil(centerY + safeRadius), 0, image.height - 1);
  const radiusSquared = safeRadius * safeRadius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (distanceSquared(x + 0.5, y + 0.5, centerX, centerY) <= radiusSquared) {
        blendPixel(image, x, y, color);
      }
    }
  }
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number) {
  return (x2 - x1) ** 2 + (y2 - y1) ** 2;
}

function parseHexColor(color: string): Rgba {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#111827";

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
    a: 1
  };
}

type ImageBuffer = {
  width: number;
  height: number;
  data: Buffer;
};

function createImage(width: number, height: number, color: Rgba): ImageBuffer {
  const image = {
    width,
    height,
    data: Buffer.alloc(width * height * 4)
  };

  fillRect(image, 0, 0, width, height, color);

  return image;
}

function blendPixel(image: ImageBuffer, x: number, y: number, color: Rgba) {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) return;

  const offset = (y * image.width + x) * 4;
  const sourceAlpha = clamp(color.a, 0, 1);
  const inverseAlpha = 1 - sourceAlpha;
  const currentR = image.data[offset] ?? 0;
  const currentG = image.data[offset + 1] ?? 0;
  const currentB = image.data[offset + 2] ?? 0;

  image.data[offset] = Math.round(color.r * sourceAlpha + currentR * inverseAlpha);
  image.data[offset + 1] = Math.round(color.g * sourceAlpha + currentG * inverseAlpha);
  image.data[offset + 2] = Math.round(color.b * sourceAlpha + currentB * inverseAlpha);
  image.data[offset + 3] = 255;
}

function encodePng(image: ImageBuffer) {
  const scanlineLength = image.width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * image.height);

  for (let y = 0; y < image.height; y += 1) {
    const rawOffset = y * scanlineLength;
    const imageOffset = y * image.width * 4;
    raw[rawOffset] = 0;
    image.data.copy(raw, rawOffset + 1, imageOffset, imageOffset + image.width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    createPngChunk("IHDR", createIhdrData(image.width, image.height)),
    createPngChunk("IDAT", deflateSync(raw)),
    createPngChunk("IEND", Buffer.alloc(0))
  ]);
}

function createIhdrData(width: number, height: number) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;

  return data;
}

function createPngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]!;
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
