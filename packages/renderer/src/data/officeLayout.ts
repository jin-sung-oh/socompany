export type OfficePoint = {
  x: number;
  y: number;
};

export type OfficeFloorVariant = "wood" | "stone" | "carpet" | "corridor" | "focus";

export type OfficeZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  variant: "lounge" | "open-pod" | "meeting" | "focus" | "cafe" | "corridor";
};

export type OfficeObjectKind =
  | "wall"
  | "door"
  | "desk"
  | "chair"
  | "plant"
  | "sofa"
  | "coffee-bar"
  | "meeting-table";

export type OfficeObject = {
  id: string;
  kind: OfficeObjectKind;
  x: number;
  y: number;
  w: number;
  h: number;
  collision: boolean;
  label?: string;
  role?: string;
};

export type OfficeDoor = {
  id: string;
  label: string;
  x: number;
  y: number;
  fromZoneId: string;
  toZoneId: string;
};

export type OfficeSeat = {
  id: string;
  label: string;
  role?: string;
  x: number;
  y: number;
};

export const TILE_SIZE = 48;
export const OFFICE_GRID_WIDTH = 24;
export const OFFICE_GRID_HEIGHT = 16;

export const OFFICE_ZONES: OfficeZone[] = [
  { id: "zone-lounge", label: "Lounge", x: 1, y: 1, w: 6, h: 4, variant: "lounge" },
  { id: "zone-cafe", label: "Coffee Bar", x: 8, y: 1, w: 4, h: 3, variant: "cafe" },
  { id: "zone-meeting", label: "Meeting Room", x: 14, y: 1, w: 8, h: 5, variant: "meeting" },
  { id: "zone-open-left", label: "Open Desk Pod", x: 1, y: 6, w: 8, h: 5, variant: "open-pod" },
  { id: "zone-open-right", label: "Open Desk Pod", x: 14, y: 6, w: 8, h: 5, variant: "open-pod" },
  { id: "zone-corridor", label: "Main Walkway", x: 10, y: 1, w: 3, h: 14, variant: "corridor" },
  { id: "zone-focus", label: "Focus Booth", x: 3, y: 12, w: 6, h: 3, variant: "focus" },
  { id: "zone-ship", label: "Command Deck", x: 14, y: 12, w: 7, h: 3, variant: "focus" },
];

export const OFFICE_SEATS: OfficeSeat[] = [
  { id: "seat-research", label: "Research Pod", role: "Research Agent", x: 4, y: 9 },
  { id: "seat-planning", label: "Planning Pod", role: "Planning Agent", x: 7, y: 9 },
  { id: "seat-trend", label: "Trend Pod", role: "Trend Agent", x: 16, y: 9 },
  { id: "seat-document", label: "Document Pod", role: "Document Agent", x: 19, y: 9 },
  { id: "seat-coding", label: "Coding Booth", role: "Coding Agent", x: 5, y: 13 },
  { id: "seat-test", label: "Test Booth", role: "Test Agent", x: 8, y: 13 },
  { id: "seat-pm", label: "PM Desk", role: "PM Agent", x: 16, y: 13 },
];

export const OFFICE_DOORS: OfficeDoor[] = [
  { id: "door-meeting", label: "Meeting Door", x: 14, y: 3, fromZoneId: "zone-corridor", toZoneId: "zone-meeting" },
  { id: "door-focus-left", label: "Focus Door", x: 8, y: 13, fromZoneId: "zone-corridor", toZoneId: "zone-focus" },
  { id: "door-focus-right", label: "Command Door", x: 14, y: 13, fromZoneId: "zone-corridor", toZoneId: "zone-ship" },
];

const deskObjects: OfficeObject[] = [
  { id: "desk-research", kind: "desk", x: 3, y: 8, w: 2, h: 1, collision: true, role: "Research Agent", label: "Research Desk" },
  { id: "chair-research", kind: "chair", x: 4, y: 9, w: 1, h: 1, collision: false, role: "Research Agent" },
  { id: "desk-planning", kind: "desk", x: 6, y: 8, w: 2, h: 1, collision: true, role: "Planning Agent", label: "Planning Desk" },
  { id: "chair-planning", kind: "chair", x: 7, y: 9, w: 1, h: 1, collision: false, role: "Planning Agent" },
  { id: "desk-trend", kind: "desk", x: 15, y: 8, w: 2, h: 1, collision: true, role: "Trend Agent", label: "Trend Desk" },
  { id: "chair-trend", kind: "chair", x: 16, y: 9, w: 1, h: 1, collision: false, role: "Trend Agent" },
  { id: "desk-document", kind: "desk", x: 18, y: 8, w: 2, h: 1, collision: true, role: "Document Agent", label: "Document Desk" },
  { id: "chair-document", kind: "chair", x: 19, y: 9, w: 1, h: 1, collision: false, role: "Document Agent" },
  { id: "desk-coding", kind: "desk", x: 4, y: 12, w: 2, h: 1, collision: true, role: "Coding Agent", label: "Coding Desk" },
  { id: "chair-coding", kind: "chair", x: 5, y: 13, w: 1, h: 1, collision: false, role: "Coding Agent" },
  { id: "desk-test", kind: "desk", x: 7, y: 12, w: 2, h: 1, collision: true, role: "Test Agent", label: "Test Desk" },
  { id: "chair-test", kind: "chair", x: 8, y: 13, w: 1, h: 1, collision: false, role: "Test Agent" },
  { id: "desk-pm", kind: "desk", x: 15, y: 12, w: 3, h: 1, collision: true, role: "PM Agent", label: "PM Desk" },
  { id: "chair-pm", kind: "chair", x: 16, y: 13, w: 1, h: 1, collision: false, role: "PM Agent" },
];

const structuralObjects: OfficeObject[] = [
  { id: "wall-meeting-top", kind: "wall", x: 14, y: 1, w: 8, h: 1, collision: true },
  { id: "wall-meeting-right", kind: "wall", x: 21, y: 1, w: 1, h: 5, collision: true },
  { id: "wall-meeting-bottom", kind: "wall", x: 14, y: 5, w: 8, h: 1, collision: true },
  { id: "wall-meeting-left-top", kind: "wall", x: 14, y: 1, w: 1, h: 2, collision: true },
  { id: "wall-meeting-left-bottom", kind: "wall", x: 14, y: 4, w: 1, h: 2, collision: true },
  { id: "door-meeting", kind: "door", x: 14, y: 3, w: 1, h: 1, collision: false, label: "Meeting Room Door" },
  { id: "wall-focus-top", kind: "wall", x: 3, y: 12, w: 6, h: 1, collision: true },
  { id: "wall-focus-left", kind: "wall", x: 3, y: 12, w: 1, h: 3, collision: true },
  { id: "wall-focus-bottom", kind: "wall", x: 3, y: 14, w: 6, h: 1, collision: true },
  { id: "wall-focus-right-top", kind: "wall", x: 8, y: 12, w: 1, h: 1, collision: true },
  { id: "wall-focus-right-bottom", kind: "wall", x: 8, y: 14, w: 1, h: 1, collision: true },
  { id: "door-focus-left", kind: "door", x: 8, y: 13, w: 1, h: 1, collision: false, label: "Focus Door" },
  { id: "wall-command-top", kind: "wall", x: 14, y: 12, w: 7, h: 1, collision: true },
  { id: "wall-command-left-top", kind: "wall", x: 14, y: 12, w: 1, h: 1, collision: true },
  { id: "wall-command-left-bottom", kind: "wall", x: 14, y: 14, w: 1, h: 1, collision: true },
  { id: "wall-command-right", kind: "wall", x: 20, y: 12, w: 1, h: 3, collision: true },
  { id: "wall-command-bottom", kind: "wall", x: 14, y: 14, w: 7, h: 1, collision: true },
  { id: "door-focus-right", kind: "door", x: 14, y: 13, w: 1, h: 1, collision: false, label: "Command Deck Door" },
];

const furnitureObjects: OfficeObject[] = [
  { id: "sofa-left", kind: "sofa", x: 2, y: 2, w: 2, h: 1, collision: true },
  { id: "sofa-right", kind: "sofa", x: 4, y: 2, w: 2, h: 1, collision: true },
  { id: "plant-lounge", kind: "plant", x: 1, y: 4, w: 1, h: 1, collision: true },
  { id: "plant-meeting", kind: "plant", x: 22, y: 1, w: 1, h: 1, collision: true },
  { id: "plant-command", kind: "plant", x: 21, y: 14, w: 1, h: 1, collision: true },
  { id: "coffee-bar", kind: "coffee-bar", x: 8, y: 1, w: 3, h: 2, collision: true },
  { id: "meeting-table", kind: "meeting-table", x: 17, y: 2, w: 3, h: 2, collision: true },
];

export const OFFICE_OBJECTS: OfficeObject[] = [...structuralObjects, ...furnitureObjects, ...deskObjects];

const createFloorMap = () => {
  const floorMap: OfficeFloorVariant[][] = Array.from({ length: OFFICE_GRID_HEIGHT }, () =>
    Array.from({ length: OFFICE_GRID_WIDTH }, () => "wood" as OfficeFloorVariant),
  );

  const fillRegion = (zone: OfficeZone, variant: OfficeFloorVariant) => {
    for (let row = zone.y; row < zone.y + zone.h; row += 1) {
      for (let column = zone.x; column < zone.x + zone.w; column += 1) {
        if (row >= 0 && row < OFFICE_GRID_HEIGHT && column >= 0 && column < OFFICE_GRID_WIDTH) {
          floorMap[row][column] = variant;
        }
      }
    }
  };

  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-lounge")!, "carpet");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-cafe")!, "stone");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-meeting")!, "stone");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-open-left")!, "wood");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-open-right")!, "wood");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-corridor")!, "corridor");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-focus")!, "focus");
  fillRegion(OFFICE_ZONES.find((zone) => zone.id === "zone-ship")!, "focus");

  return floorMap;
};

const createCollisionMap = () => {
  const collisionMap: number[][] = Array.from({ length: OFFICE_GRID_HEIGHT }, () =>
    Array.from({ length: OFFICE_GRID_WIDTH }, () => 0),
  );

  OFFICE_OBJECTS.forEach((object) => {
    if (!object.collision) {
      return;
    }

    for (let row = object.y; row < object.y + object.h; row += 1) {
      for (let column = object.x; column < object.x + object.w; column += 1) {
        if (row >= 0 && row < OFFICE_GRID_HEIGHT && column >= 0 && column < OFFICE_GRID_WIDTH) {
          collisionMap[row][column] = 1;
        }
      }
    }
  });

  return collisionMap;
};

export const OFFICE_FLOOR_MAP = createFloorMap();
export const OFFICE_COLLISION_MAP = createCollisionMap();

export const PLAYER_SPAWN: OfficePoint = {
  x: 11,
  y: 6,
};

export const getSeatByRole = (role: string) => OFFICE_SEATS.find((seat) => seat.role === role) ?? null;
