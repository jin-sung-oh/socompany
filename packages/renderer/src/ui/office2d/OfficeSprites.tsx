import type { OfficeFloorVariant, OfficeObject } from "../../data/officeLayout";

type PixelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
};

const TILE_PIXELS = 16;

const roleAccentByRole: Record<string, string> = {
  "PM Agent": "#f6c768",
  "Research Agent": "#7dd3fc",
  "Trend Agent": "#f472b6",
  "Planning Agent": "#f59e0b",
  "Document Agent": "#a78bfa",
  "Coding Agent": "#60a5fa",
  "Test Agent": "#34d399",
};

const PixelSprite = ({
  width,
  height,
  rects,
  className,
}: {
  width: number;
  height: number;
  rects: PixelRect[];
  className?: string;
}) => (
  <svg
    className={`spatial-office-sprite-svg${className ? ` ${className}` : ""}`}
    viewBox={`0 0 ${width} ${height}`}
    preserveAspectRatio="none"
    shapeRendering="crispEdges"
    aria-hidden="true"
  >
    {rects.map((rect, index) => (
      <rect
        key={`${rect.x}-${rect.y}-${index}`}
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        fill={rect.fill}
        opacity={rect.opacity}
      />
    ))}
  </svg>
);

const framedRect = (
  width: number,
  height: number,
  outer: string,
  inner: string,
  highlight: string,
  shadow: string,
): PixelRect[] => [
  { x: 0, y: 0, w: width, h: height, fill: outer },
  { x: 1, y: 1, w: Math.max(width - 2, 1), h: Math.max(height - 2, 1), fill: inner },
  { x: 1, y: 1, w: Math.max(width - 2, 1), h: 1, fill: highlight },
  { x: 1, y: Math.max(height - 2, 1), w: Math.max(width - 2, 1), h: 1, fill: shadow },
];

const createFloorRects = (variant: OfficeFloorVariant): PixelRect[] => {
  switch (variant) {
    case "stone":
      return [
        { x: 0, y: 0, w: 16, h: 16, fill: "#aeb9c2" },
        { x: 0, y: 0, w: 16, h: 2, fill: "#d7e1e8" },
        { x: 0, y: 6, w: 16, h: 1, fill: "#98a7b2" },
        { x: 5, y: 0, w: 1, h: 16, fill: "#8b9ca8" },
        { x: 11, y: 0, w: 1, h: 16, fill: "#8b9ca8" },
        { x: 2, y: 3, w: 2, h: 2, fill: "#dfe6eb" },
        { x: 8, y: 9, w: 3, h: 2, fill: "#d6dde3" },
      ];
    case "carpet":
      return [
        { x: 0, y: 0, w: 16, h: 16, fill: "#a08469" },
        { x: 0, y: 0, w: 16, h: 1, fill: "#c8ac90" },
        { x: 0, y: 15, w: 16, h: 1, fill: "#7b614c" },
        { x: 2, y: 2, w: 12, h: 12, fill: "#90745c" },
        { x: 4, y: 4, w: 8, h: 1, fill: "#b79a7f" },
        { x: 4, y: 8, w: 8, h: 1, fill: "#b79a7f" },
        { x: 4, y: 12, w: 8, h: 1, fill: "#b79a7f" },
      ];
    case "corridor":
      return [
        { x: 0, y: 0, w: 16, h: 16, fill: "#7e92a6" },
        { x: 0, y: 0, w: 16, h: 2, fill: "#a7bccf" },
        { x: 0, y: 14, w: 16, h: 2, fill: "#617689" },
        { x: 2, y: 0, w: 1, h: 16, fill: "#b4c5d5" },
        { x: 13, y: 0, w: 1, h: 16, fill: "#b4c5d5" },
        { x: 7, y: 2, w: 2, h: 3, fill: "#dbe8f3" },
        { x: 7, y: 7, w: 2, h: 3, fill: "#dbe8f3" },
        { x: 7, y: 12, w: 2, h: 2, fill: "#dbe8f3" },
      ];
    case "focus":
      return [
        { x: 0, y: 0, w: 16, h: 16, fill: "#6a7786" },
        { x: 1, y: 1, w: 14, h: 14, fill: "#5d6977" },
        { x: 3, y: 3, w: 10, h: 10, fill: "#4e5966" },
        { x: 6, y: 0, w: 4, h: 16, fill: "#7b8b9d", opacity: 0.4 },
        { x: 0, y: 6, w: 16, h: 4, fill: "#8ea1b6", opacity: 0.18 },
      ];
    case "wood":
    default:
      return [
        { x: 0, y: 0, w: 16, h: 16, fill: "#b98657" },
        { x: 0, y: 0, w: 16, h: 2, fill: "#d39b68" },
        { x: 0, y: 14, w: 16, h: 2, fill: "#8f643e" },
        { x: 3, y: 0, w: 1, h: 16, fill: "#996843" },
        { x: 8, y: 0, w: 1, h: 16, fill: "#996843" },
        { x: 13, y: 0, w: 1, h: 16, fill: "#996843" },
        { x: 5, y: 5, w: 2, h: 2, fill: "#d8a775" },
        { x: 10, y: 10, w: 2, h: 2, fill: "#d8a775" },
      ];
  }
};

const createWallRects = (width: number, height: number): PixelRect[] => {
  const rects = framedRect(width, height, "#8ea1b1", "#dce5ec", "#f4f8fb", "#738596");
  if (width >= height) {
    for (let x = 4; x < width - 2; x += 6) {
      rects.push({ x, y: 3, w: 1, h: Math.max(height - 6, 1), fill: "#afc0cd" });
    }
  } else {
    for (let y = 4; y < height - 2; y += 6) {
      rects.push({ x: 3, y, w: Math.max(width - 6, 1), h: 1, fill: "#afc0cd" });
    }
  }
  return rects;
};

const createDoorBaseRects = (width: number, height: number): PixelRect[] => [
  ...framedRect(width, height, "#45667f", "#7ba0bc", "#cce0ef", "#314758"),
  { x: 3, y: 2, w: Math.max(width - 6, 1), h: Math.max(height - 5, 1), fill: "#99bfd4" },
  { x: 4, y: 3, w: Math.max(width - 8, 1), h: Math.max(height - 7, 1), fill: "#d7edf7" },
  { x: Math.max(width - 4, 1), y: Math.floor(height / 2), w: 1, h: 1, fill: "#f0c56a" },
];

const createDoorPanelRects = (width: number, height: number): PixelRect[] => [
  { x: 2, y: 2, w: Math.max(width - 4, 1), h: Math.max(height - 4, 1), fill: "#79a1ba" },
  { x: 3, y: 3, w: Math.max(width - 6, 1), h: Math.max(height - 6, 1), fill: "#d8eff8" },
  { x: 4, y: 4, w: Math.max(width - 8, 1), h: Math.max(height - 9, 1), fill: "#b9d7e7" },
  { x: Math.max(width - 5, 1), y: Math.floor(height / 2), w: 1, h: 1, fill: "#f9d77d" },
];

const createDeskRects = (width: number, height: number, accent: string): PixelRect[] => [
  ...framedRect(width, height, "#6a4f38", "#d8c3ab", "#f5eadb", "#9e7b57"),
  { x: 2, y: 3, w: Math.max(width - 4, 1), h: 6, fill: "#ead7c3" },
  { x: 3, y: 4, w: Math.max(width - 6, 1), h: 2, fill: accent, opacity: 0.85 },
  { x: Math.floor(width / 2) - 4, y: 1, w: 8, h: 4, fill: "#223447" },
  { x: Math.floor(width / 2) - 3, y: 2, w: 6, h: 2, fill: "#90cdf4" },
  { x: Math.floor(width / 2) - 3, y: 6, w: 6, h: 1, fill: "#55687a" },
  { x: Math.floor(width / 2) - 4, y: 10, w: 8, h: 1, fill: "#f3f6f8" },
  { x: width - 5, y: 6, w: 2, h: 2, fill: "#dc7f5f" },
  { x: 3, y: 12, w: 2, h: 3, fill: "#806145" },
  { x: width - 5, y: 12, w: 2, h: 3, fill: "#806145" },
];

const createChairRects = (accent: string): PixelRect[] => [
  { x: 4, y: 1, w: 8, h: 4, fill: "#4e657a" },
  { x: 5, y: 2, w: 6, h: 2, fill: accent, opacity: 0.6 },
  { x: 3, y: 6, w: 10, h: 4, fill: "#6d89a3" },
  { x: 4, y: 7, w: 8, h: 2, fill: "#b9d1e6", opacity: 0.4 },
  { x: 7, y: 10, w: 2, h: 3, fill: "#394756" },
  { x: 5, y: 13, w: 6, h: 1, fill: "#394756" },
];

const createPlantRects = (): PixelRect[] => [
  { x: 6, y: 1, w: 4, h: 3, fill: "#3c9a5b" },
  { x: 3, y: 4, w: 10, h: 4, fill: "#55b56f" },
  { x: 2, y: 7, w: 12, h: 3, fill: "#2f7f49" },
  { x: 6, y: 9, w: 4, h: 2, fill: "#49784c" },
  { x: 4, y: 11, w: 8, h: 4, fill: "#bf835a" },
  { x: 5, y: 12, w: 6, h: 2, fill: "#e2ad82" },
];

const createSofaRects = (width: number): PixelRect[] => [
  ...framedRect(width, 16, "#714f43", "#b88f7e", "#e0b8a7", "#8b6659"),
  { x: 2, y: 3, w: Math.max(width - 4, 1), h: 4, fill: "#d9b4a2" },
  { x: 2, y: 8, w: Math.floor((width - 5) / 2), h: 5, fill: "#c79d8a" },
  { x: width - Math.floor((width - 5) / 2) - 2, y: 8, w: Math.floor((width - 5) / 2), h: 5, fill: "#c79d8a" },
  { x: Math.floor(width / 2) - 1, y: 8, w: 2, h: 5, fill: "#af866f" },
];

const createCoffeeBarRects = (width: number, height: number): PixelRect[] => [
  ...framedRect(width, height, "#4c6173", "#748ba0", "#b6c8d7", "#364553"),
  { x: 2, y: 2, w: Math.max(width - 4, 1), h: 4, fill: "#cfd9e1" },
  { x: 4, y: 7, w: 9, h: 8, fill: "#5d7488" },
  { x: 6, y: 9, w: 5, h: 3, fill: "#253649" },
  { x: width - 10, y: 6, w: 6, h: 11, fill: "#3c4f61" },
  { x: width - 9, y: 7, w: 4, h: 5, fill: "#d3e4ef" },
  { x: 3, y: height - 5, w: 3, h: 2, fill: "#f5f5f4" },
  { x: 7, y: height - 5, w: 3, h: 2, fill: "#f5f5f4" },
];

const createMeetingTableRects = (width: number, height: number): PixelRect[] => [
  ...framedRect(width, height, "#73563a", "#caa27d", "#e3c2a2", "#9d744d"),
  { x: 3, y: 3, w: Math.max(width - 6, 1), h: Math.max(height - 6, 1), fill: "#d5b18a" },
  { x: Math.floor(width / 2) - 2, y: 2, w: 4, h: Math.max(height - 4, 1), fill: "#f0d7c0" },
  { x: 4, y: 1, w: 3, h: 2, fill: "#7a94ad" },
  { x: width - 7, y: 1, w: 3, h: 2, fill: "#7a94ad" },
  { x: 4, y: height - 3, w: 3, h: 2, fill: "#7a94ad" },
  { x: width - 7, y: height - 3, w: 3, h: 2, fill: "#7a94ad" },
];

const getObjectRects = (object: OfficeObject) => {
  const width = object.w * TILE_PIXELS;
  const height = object.h * TILE_PIXELS;
  const accent = roleAccentByRole[object.role ?? ""] ?? "#7dd3fc";

  switch (object.kind) {
    case "wall":
      return createWallRects(width, height);
    case "desk":
      return createDeskRects(width, height, accent);
    case "chair":
      return createChairRects(accent);
    case "plant":
      return createPlantRects();
    case "sofa":
      return createSofaRects(width);
    case "coffee-bar":
      return createCoffeeBarRects(width, height);
    case "meeting-table":
      return createMeetingTableRects(width, height);
    default:
      return [];
  }
};

export function OfficeFloorSprite({ variant }: { variant: OfficeFloorVariant }) {
  return (
    <div className={`spatial-office-floor-sprite ${variant}`}>
      <PixelSprite width={TILE_PIXELS} height={TILE_PIXELS} rects={createFloorRects(variant)} />
    </div>
  );
}

export function OfficeObjectSprite({ object }: { object: OfficeObject }) {
  const width = object.w * TILE_PIXELS;
  const height = object.h * TILE_PIXELS;

  if (object.kind === "door") {
    return (
      <div className="spatial-office-door-sprite">
        <PixelSprite width={width} height={height} rects={createDoorBaseRects(width, height)} />
        <PixelSprite width={width} height={height} rects={createDoorPanelRects(width, height)} className="spatial-office-door-panel-sprite" />
      </div>
    );
  }

  return (
    <div className={`spatial-office-object-sprite ${object.kind}`}>
      <PixelSprite width={width} height={height} rects={getObjectRects(object)} />
    </div>
  );
}
