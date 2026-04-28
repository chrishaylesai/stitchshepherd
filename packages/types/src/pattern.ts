export enum StitchType {
  Full = 0,
  HalfTopLeftToBottomRight = 1,
  HalfBottomLeftToTopRight = 2,
  QuarterTopLeft = 3,
  QuarterTopRight = 4,
  QuarterBottomLeft = 5,
  QuarterBottomRight = 6,
  ThreeQuarterTopLeft = 7,
  ThreeQuarterTopRight = 8,
  ThreeQuarterBottomLeft = 9,
  ThreeQuarterBottomRight = 10
}

export type FrameType = "none" | "circle" | "oval" | "rectangle";

export type CircleFrame = {
  type: "circle";
  radius: number;
  centerX?: number;
  centerY?: number;
};

export type OvalFrame = {
  type: "oval";
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
};

export type RectangleFrame = {
  type: "rectangle";
  width: number;
  height: number;
  x?: number;
  y?: number;
};

export type NoFrame = {
  type: "none";
};

export type FrameConfig = NoFrame | CircleFrame | OvalFrame | RectangleFrame;

export type PaletteEntry = {
  id: number;
  color: `#${string}`;
  name?: string;
  symbol: string;
};

export type StitchData = {
  x: number;
  y: number;
  p: number;
  t: StitchType;
};

export type BackstitchData = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  p: number;
};

export type KnotData = {
  x: number;
  y: number;
  p: number;
};

export type PatternContent = {
  version: 1;
  palette: PaletteEntry[];
  stitches: StitchData[];
  backstitches: BackstitchData[];
  knots: KnotData[];
};

export type PatternMetadata = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  gridWidth: number;
  gridHeight: number;
  fabricCount: number;
  frame: FrameConfig;
  stitchCount: number;
  colorCount: number;
  thumbnailUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Viewport = {
  offsetX: number;
  offsetY: number;
  zoom: number;
};

export type GridCoord = {
  x: number;
  y: number;
};

export const EMPTY_PATTERN_CONTENT: PatternContent = {
  version: 1,
  palette: [],
  stitches: [],
  backstitches: [],
  knots: []
};
