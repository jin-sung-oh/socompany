import {
  OFFICE_COLLISION_MAP,
  OFFICE_DOORS,
  OFFICE_GRID_HEIGHT,
  OFFICE_GRID_WIDTH,
  OFFICE_OBJECTS,
  OFFICE_ZONES,
  type OfficeDoor,
  type OfficeObject,
  type OfficePoint,
  type OfficeZone,
} from "./officeLayout";

type MovementOptions = {
  blockedPositions?: OfficePoint[];
  goal?: OfficePoint | null;
};

type RandomOfficePositionOptions = MovementOptions & {
  origin?: OfficePoint;
  minDistance?: number;
  maxDistance?: number;
  preferredZoneIds?: string[];
  allowedZoneIds?: string[];
  avoidObjectKinds?: OfficeObject["kind"][];
};

const cardinalSteps: OfficePoint[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const toKey = ({ x, y }: OfficePoint) => `${x}:${y}`;

const normalizeBlockedPositions = (blockedPositions: OfficePoint[] = [], goal?: OfficePoint | null) =>
  new Set(
    blockedPositions
      .filter((position) => !(goal && position.x === goal.x && position.y === goal.y))
      .map((position) => toKey(position)),
  );

export const clampOfficePosition = (x: number, y: number): OfficePoint => ({
  x: Math.max(0, Math.min(OFFICE_GRID_WIDTH - 1, Math.round(x))),
  y: Math.max(0, Math.min(OFFICE_GRID_HEIGHT - 1, Math.round(y))),
});

export const distanceBetween = (left: OfficePoint, right: OfficePoint) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getGridDistance = (left: OfficePoint, right: OfficePoint) =>
  Math.abs(left.x - right.x) + Math.abs(left.y - right.y);

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

export const isWithinOfficeBounds = ({ x, y }: OfficePoint) =>
  x >= 0 && x < OFFICE_GRID_WIDTH && y >= 0 && y < OFFICE_GRID_HEIGHT;

export const canOccupyOfficePosition = (position: OfficePoint, options: MovementOptions = {}) => {
  if (!isWithinOfficeBounds(position)) {
    return false;
  }

  if (OFFICE_COLLISION_MAP[position.y]?.[position.x] === 1) {
    return false;
  }

  const blockedKeys = normalizeBlockedPositions(options.blockedPositions, options.goal);
  return !blockedKeys.has(toKey(position));
};

export const moveWithinOffice = (origin: OfficePoint, delta: OfficePoint, options: MovementOptions = {}) => {
  const nextPosition = clampOfficePosition(origin.x + delta.x, origin.y + delta.y);
  if (canOccupyOfficePosition(nextPosition, options)) {
    return nextPosition;
  }

  return origin;
};

export const getZoneForPosition = (position: OfficePoint): OfficeZone | null =>
  OFFICE_ZONES.find(
    (zone) =>
      position.x >= zone.x &&
      position.x < zone.x + zone.w &&
      position.y >= zone.y &&
      position.y < zone.y + zone.h,
  ) ?? null;

export const getLocationLabel = (position: OfficePoint) => {
  const zone = getZoneForPosition(position);
  if (zone) {
    return zone.label;
  }

  const object = getObjectAtPosition(position);
  return object?.label ?? "Office Floor";
};

export const getObjectAtPosition = (position: OfficePoint): OfficeObject | null =>
  OFFICE_OBJECTS.find(
    (object) =>
      position.x >= object.x &&
      position.x < object.x + object.w &&
      position.y >= object.y &&
      position.y < object.y + object.h,
  ) ?? null;

export const findNearestDoor = (position: OfficePoint, maxDistance = 2): OfficeDoor | null => {
  const candidates = OFFICE_DOORS
    .map((door) => ({ door, distance: distanceBetween(position, { x: door.x, y: door.y }) }))
    .filter((item) => item.distance <= maxDistance)
    .sort((left, right) => left.distance - right.distance);

  return candidates[0]?.door ?? null;
};

export const getDoorInteractionLabel = (door: OfficeDoor) => door.label;

export const getDoorTransitionTarget = (door: OfficeDoor, position: OfficePoint) => {
  const candidates = cardinalSteps
    .map((step) => clampOfficePosition(door.x + step.x, door.y + step.y))
    .filter((candidate) => canOccupyOfficePosition(candidate));

  return (
    candidates.sort((left, right) => distanceBetween(left, position) - distanceBetween(right, position))[0] ?? {
      x: door.x,
      y: door.y,
    }
  );
};

export const getDoorLaneForPosition = (position: OfficePoint) =>
  OFFICE_DOORS.find((door) => distanceBetween(position, { x: door.x, y: door.y }) <= 1) ?? null;

const reconstructPath = (cameFrom: Map<string, string>, endKey: string) => {
  const path: OfficePoint[] = [];
  let currentKey: string | undefined = endKey;

  while (currentKey) {
    const [x, y] = currentKey.split(":").map(Number);
    path.unshift({ x, y });
    currentKey = cameFrom.get(currentKey);
  }

  return path;
};

export const findOfficePath = (start: OfficePoint, goal: OfficePoint, options: MovementOptions = {}) => {
  if (!canOccupyOfficePosition(goal, options)) {
    return [start];
  }

  const blockedKeys = normalizeBlockedPositions(options.blockedPositions, goal);
  const queue: OfficePoint[] = [start];
  const visited = new Set([toKey(start)]);
  const cameFrom = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = toKey(current);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, currentKey);
    }

    cardinalSteps.forEach((step) => {
      const next = clampOfficePosition(current.x + step.x, current.y + step.y);
      const nextKey = toKey(next);

      if (
        visited.has(nextKey) ||
        !isWithinOfficeBounds(next) ||
        OFFICE_COLLISION_MAP[next.y]?.[next.x] === 1 ||
        blockedKeys.has(nextKey)
      ) {
        return;
      }

      visited.add(nextKey);
      cameFrom.set(nextKey, currentKey);
      queue.push(next);
    });
  }

  return [start];
};

export const getNextOfficeWaypoint = (current: OfficePoint, destination: OfficePoint, options: MovementOptions = {}) => {
  if (current.x === destination.x && current.y === destination.y) {
    return current;
  }

  const path = findOfficePath(current, destination, options);
  if (path[1]) {
    return path[1];
  }

  if (options.blockedPositions?.length) {
    const relaxedPath = findOfficePath(current, destination, {
      ...options,
      blockedPositions: [],
    });
    const relaxedNext = relaxedPath[1];
    const blockedKeys = normalizeBlockedPositions(options.blockedPositions, options.goal);

    if (relaxedNext && !blockedKeys.has(toKey(relaxedNext))) {
      return relaxedNext;
    }
  }

  return current;
};

const pickRandomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)] ?? null;

export const getRandomOfficePosition = (options: RandomOfficePositionOptions = {}) => {
  const {
    origin,
    minDistance = 0,
    maxDistance,
    preferredZoneIds,
    allowedZoneIds,
    avoidObjectKinds = [],
  } = options;

  const preferredCandidates: OfficePoint[] = [];
  const fallbackCandidates: OfficePoint[] = [];
  const avoidKinds = new Set(avoidObjectKinds);

  for (let y = 0; y < OFFICE_GRID_HEIGHT; y += 1) {
    for (let x = 0; x < OFFICE_GRID_WIDTH; x += 1) {
      const position = { x, y };

      if (!canOccupyOfficePosition(position, options)) {
        continue;
      }

      const zoneId = getZoneForPosition(position)?.id;
      if (allowedZoneIds?.length && (!zoneId || !allowedZoneIds.includes(zoneId))) {
        continue;
      }

      const object = getObjectAtPosition(position);
      if (object && avoidKinds.has(object.kind)) {
        continue;
      }

      if (origin) {
        const path = findOfficePath(origin, position, options);
        const pathDistance = path.length - 1;

        if (pathDistance < minDistance || pathDistance <= 0) {
          continue;
        }

        if (typeof maxDistance === "number" && pathDistance > maxDistance) {
          continue;
        }
      }

      if (preferredZoneIds?.length && zoneId && preferredZoneIds.includes(zoneId)) {
        preferredCandidates.push(position);
        continue;
      }

      fallbackCandidates.push(position);
    }
  }

  return pickRandomItem(preferredCandidates) ?? pickRandomItem(fallbackCandidates);
};
