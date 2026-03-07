export type OfficePoint = {
  x: number;
  y: number;
};

export type OfficeZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  variant: "lounge" | "open-pod" | "meeting" | "focus" | "cafe" | "corridor";
};

export type OfficeWall = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type OfficeDoor = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roomZoneId: string;
  hallAnchor: OfficePoint;
  roomAnchor: OfficePoint;
};

export type OfficeSeat = {
  id: string;
  label: string;
  role?: string;
  x: number;
  y: number;
  deskX: number;
  deskY: number;
  deskW: number;
  deskH: number;
};

export const OFFICE_ZONES: OfficeZone[] = [
  { id: "zone-lounge", label: "Lounge", x: 6, y: 8, w: 27, h: 18, variant: "lounge" },
  { id: "zone-cafe", label: "Coffee Bar", x: 38, y: 8, w: 18, h: 12, variant: "cafe" },
  { id: "zone-meeting", label: "Meeting Room", x: 60, y: 8, w: 30, h: 24, variant: "meeting" },
  { id: "zone-open-left", label: "Open Desk Pod", x: 8, y: 34, w: 31, h: 26, variant: "open-pod" },
  { id: "zone-open-right", label: "Open Desk Pod", x: 55, y: 34, w: 31, h: 26, variant: "open-pod" },
  { id: "zone-corridor", label: "Main Walkway", x: 41, y: 24, w: 12, h: 56, variant: "corridor" },
  { id: "zone-focus", label: "Focus Booth", x: 22, y: 66, w: 28, h: 18, variant: "focus" },
  { id: "zone-ship", label: "Command Deck", x: 56, y: 66, w: 28, h: 18, variant: "focus" },
];

export const OFFICE_WALLS: OfficeWall[] = [
  { id: "meeting-top", x: 60, y: 8, w: 30, h: 1.6 },
  { id: "meeting-right", x: 88.4, y: 8, w: 1.6, h: 24 },
  { id: "meeting-bottom", x: 60, y: 30.4, w: 30, h: 1.6 },
  { id: "meeting-left-a", x: 60, y: 8, w: 1.6, h: 8.8 },
  { id: "meeting-left-b", x: 60, y: 24.2, w: 1.6, h: 7.8 },
  { id: "focus-left-top", x: 22, y: 66, w: 28, h: 1.6 },
  { id: "focus-left-left", x: 22, y: 66, w: 1.6, h: 18 },
  { id: "focus-left-bottom", x: 22, y: 82.4, w: 28, h: 1.6 },
  { id: "focus-left-right-a", x: 48.4, y: 66, w: 1.6, h: 5.6 },
  { id: "focus-left-right-b", x: 48.4, y: 76.4, w: 1.6, h: 7.6 },
  { id: "focus-right-top", x: 56, y: 66, w: 28, h: 1.6 },
  { id: "focus-right-right", x: 82.4, y: 66, w: 1.6, h: 18 },
  { id: "focus-right-bottom", x: 56, y: 82.4, w: 28, h: 1.6 },
  { id: "focus-right-left-a", x: 56, y: 66, w: 1.6, h: 5.6 },
  { id: "focus-right-left-b", x: 56, y: 76.4, w: 1.6, h: 7.6 },
];

export const OFFICE_DOORS: OfficeDoor[] = [
  {
    id: "door-meeting",
    label: "Meeting Door",
    x: 60,
    y: 18,
    w: 1.6,
    h: 6.2,
    roomZoneId: "zone-meeting",
    hallAnchor: { x: 57.8, y: 21.1 },
    roomAnchor: { x: 63.8, y: 21.1 },
  },
  {
    id: "door-focus-left",
    label: "Focus Left Door",
    x: 48.4,
    y: 71.6,
    w: 1.6,
    h: 4.8,
    roomZoneId: "zone-focus",
    hallAnchor: { x: 51.6, y: 74 },
    roomAnchor: { x: 45.6, y: 74 },
  },
  {
    id: "door-focus-right",
    label: "Focus Right Door",
    x: 56,
    y: 71.6,
    w: 1.6,
    h: 4.8,
    roomZoneId: "zone-ship",
    hallAnchor: { x: 53.4, y: 74 },
    roomAnchor: { x: 59.2, y: 74 },
  },
];

export const OFFICE_SEATS: OfficeSeat[] = [
  { id: "seat-research", label: "Research Pod", role: "Research Agent", x: 19, y: 48, deskX: 19, deskY: 43, deskW: 14, deskH: 8 },
  { id: "seat-planning", label: "Planning Pod", role: "Planning Agent", x: 30, y: 48, deskX: 30, deskY: 43, deskW: 14, deskH: 8 },
  { id: "seat-trend", label: "Trend Pod", role: "Trend Agent", x: 64, y: 48, deskX: 64, deskY: 43, deskW: 14, deskH: 8 },
  { id: "seat-document", label: "Document Pod", role: "Document Agent", x: 76, y: 48, deskX: 76, deskY: 43, deskW: 14, deskH: 8 },
  { id: "seat-coding", label: "Coding Booth", role: "Coding Agent", x: 30, y: 78, deskX: 30, deskY: 73, deskW: 16, deskH: 8 },
  { id: "seat-test", label: "Test Booth", role: "Test Agent", x: 44, y: 78, deskX: 44, deskY: 73, deskW: 16, deskH: 8 },
  { id: "seat-pm", label: "PM Desk", role: "PM Agent", x: 70, y: 78, deskX: 70, deskY: 73, deskW: 18, deskH: 8 },
];

export const PLAYER_SPAWN: OfficePoint = {
  x: 49,
  y: 24,
};

export const getSeatByRole = (role: string) => OFFICE_SEATS.find((seat) => seat.role === role) ?? null;
