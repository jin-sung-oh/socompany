import {
  OFFICE_DOORS,
  OFFICE_WALLS,
  OFFICE_ZONES,
  type OfficeDoor,
  type OfficePoint,
  type OfficeZone,
} from "./officeLayout";

const OFFICE_BOUNDS = {
  minX: 8,
  maxX: 92,
  minY: 10,
  maxY: 90,
};

const OPEN_REGION_ID = "zone-open";
const roomZoneIds = new Set(OFFICE_DOORS.map((door) => door.roomZoneId));

type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type MovementOptions = {
  blockedPositions?: OfficePoint[];
  collisionRadius?: number;
  wallPadding?: number;
};

export const clampOfficePosition = (x: number, y: number): OfficePoint => ({
  x: Math.max(OFFICE_BOUNDS.minX, Math.min(OFFICE_BOUNDS.maxX, x)),
  y: Math.max(OFFICE_BOUNDS.minY, Math.min(OFFICE_BOUNDS.maxY, y)),
});

export const distanceBetween = (left: OfficePoint, right: OfficePoint) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const isInsideRect = (point: OfficePoint, rect: Rect) =>
  point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;

const expandRect = (rect: Rect, padding: number): Rect => ({
  x: rect.x - padding,
  y: rect.y - padding,
  w: rect.w + padding * 2,
  h: rect.h + padding * 2,
});

export const canOccupyOfficePosition = (position: OfficePoint, options: MovementOptions = {}) => {
  const { blockedPositions = [], collisionRadius = 0, wallPadding = 0.6 } = options;

  if (
    position.x < OFFICE_BOUNDS.minX ||
    position.x > OFFICE_BOUNDS.maxX ||
    position.y < OFFICE_BOUNDS.minY ||
    position.y > OFFICE_BOUNDS.maxY
  ) {
    return false;
  }

  if (OFFICE_WALLS.some((wall) => isInsideRect(position, expandRect(wall, wallPadding)))) {
    return false;
  }

  if (collisionRadius > 0 && blockedPositions.some((other) => distanceBetween(position, other) < collisionRadius)) {
    return false;
  }

  return true;
};

export const moveWithinOffice = (origin: OfficePoint, delta: OfficePoint, options: MovementOptions = {}) => {
  const nextPosition = clampOfficePosition(origin.x + delta.x, origin.y + delta.y);
  if (canOccupyOfficePosition(nextPosition, options)) {
    return nextPosition;
  }

  const horizontalOnly = clampOfficePosition(origin.x + delta.x, origin.y);
  if (canOccupyOfficePosition(horizontalOnly, options)) {
    return horizontalOnly;
  }

  const verticalOnly = clampOfficePosition(origin.x, origin.y + delta.y);
  if (canOccupyOfficePosition(verticalOnly, options)) {
    return verticalOnly;
  }

  return origin;
};

export const getDirectionFromVector = (
  dx: number,
  dy: number,
  fallback: "left" | "right" | "up" | "down",
) => {
  if (dx === 0 && dy === 0) {
    return fallback;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }

  return dy >= 0 ? "down" : "up";
};

export const getZoneForPosition = (position: OfficePoint): OfficeZone | null =>
  OFFICE_ZONES.find((zone) => isInsideRect(position, zone)) ?? null;

export const getDoorForRoomZone = (roomZoneId: string) => OFFICE_DOORS.find((door) => door.roomZoneId === roomZoneId) ?? null;

const getRegionIdForPosition = (position: OfficePoint) => {
  const zone = getZoneForPosition(position);
  if (zone && roomZoneIds.has(zone.id)) {
    return zone.id;
  }
  return OPEN_REGION_ID;
};

export const findNearestDoor = (position: OfficePoint, maxDistance = 8): OfficeDoor | null => {
  const candidates = OFFICE_DOORS
    .map((door) => ({
      door,
      distance: distanceBetween(position, { x: door.x + door.w / 2, y: door.y + door.h / 2 }),
    }))
    .filter((item) => item.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance);

  return candidates[0]?.door ?? null;
};

export const getDoorTransitionTarget = (door: OfficeDoor, position: OfficePoint) =>
  distanceBetween(position, door.hallAnchor) <= distanceBetween(position, door.roomAnchor) ? door.roomAnchor : door.hallAnchor;

export const getDoorInteractionLabel = (door: OfficeDoor, position: OfficePoint) => {
  const roomZone = OFFICE_ZONES.find((zone) => zone.id === door.roomZoneId);
  if (!roomZone) {
    return `${door.label} 통과`;
  }

  return getRegionIdForPosition(position) === door.roomZoneId ? `${roomZone.label} 나가기` : `${roomZone.label} 들어가기`;
};

export const getNextOfficeWaypoint = (current: OfficePoint, destination: OfficePoint) => {
  const currentRegion = getRegionIdForPosition(current);
  const targetRegion = getRegionIdForPosition(destination);

  if (currentRegion === targetRegion) {
    return destination;
  }

  if (currentRegion !== OPEN_REGION_ID) {
    const exitDoor = getDoorForRoomZone(currentRegion);
    if (!exitDoor) {
      return destination;
    }
    return distanceBetween(current, exitDoor.roomAnchor) > 1.4 ? exitDoor.roomAnchor : exitDoor.hallAnchor;
  }

  if (targetRegion !== OPEN_REGION_ID) {
    const entryDoor = getDoorForRoomZone(targetRegion);
    if (!entryDoor) {
      return destination;
    }
    return distanceBetween(current, entryDoor.hallAnchor) > 1.4 ? entryDoor.hallAnchor : entryDoor.roomAnchor;
  }

  return destination;
};

export const getRandomOfficePosition = (options: MovementOptions = {}) => {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const position = clampOfficePosition(10 + Math.random() * 80, 10 + Math.random() * 80);
    if (canOccupyOfficePosition(position, options)) {
      return position;
    }
  }

  return clampOfficePosition(49, 24);
};
