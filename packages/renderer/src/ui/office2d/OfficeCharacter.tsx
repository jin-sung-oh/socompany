import type { CSSProperties } from "react";
import { TILE_SIZE, type OfficePoint } from "../../data/officeLayout";

type CharacterPalette = {
  fur: string;
  furShade: string;
  earInner: string;
  outfit: string;
  outfitShade: string;
  belly: string;
  cheek: string;
  paw: string;
  accent: string;
  eye: string;
  nose: string;
  mark: string;
};

const defaultPalette: CharacterPalette = {
  fur: "#ead9bf",
  furShade: "#c6a784",
  earInner: "#f5b7b1",
  outfit: "#7c95ad",
  outfitShade: "#53697d",
  belly: "#fff6de",
  cheek: "#f3a8b6",
  paw: "#f7ecda",
  accent: "#93c5fd",
  eye: "#243447",
  nose: "#7b5e55",
  mark: "#d6b58a",
};

const characterPaletteById: Record<string, CharacterPalette> = {
  ceo: {
    fur: "#f3d8a9",
    furShade: "#cc9f67",
    earInner: "#f6c6a3",
    outfit: "#4c8dff",
    outfitShade: "#2858cf",
    belly: "#fff2c9",
    cheek: "#f6a8b5",
    paw: "#f9ecd5",
    accent: "#93c5fd",
    eye: "#243447",
    nose: "#9a6c58",
    mark: "#e0bb7b",
  },
  capybara: {
    fur: "#b98a62",
    furShade: "#8d6448",
    earInner: "#d9a98c",
    outfit: "#6b879e",
    outfitShade: "#476173",
    belly: "#e8d1b7",
    cheek: "#e39ca8",
    paw: "#e8d6c3",
    accent: "#d6a671",
    eye: "#2f231b",
    nose: "#5a4335",
    mark: "#9d7350",
  },
  fox: {
    fur: "#ef9f52",
    furShade: "#b96635",
    earInner: "#ffd1c2",
    outfit: "#607ea5",
    outfitShade: "#45607c",
    belly: "#fff0dc",
    cheek: "#ffb1bc",
    paw: "#fff1df",
    accent: "#fb923c",
    eye: "#2b1f1b",
    nose: "#7a4633",
    mark: "#fff0dc",
  },
  pig: {
    fur: "#f2b4c2",
    furShade: "#d9869e",
    earInner: "#ffd7e2",
    outfit: "#8a7cae",
    outfitShade: "#645885",
    belly: "#ffe4ec",
    cheek: "#f58ea6",
    paw: "#ffe8ef",
    accent: "#f472b6",
    eye: "#5f4955",
    nose: "#c96f8f",
    mark: "#ffd5e2",
  },
  tiger: {
    fur: "#f0b165",
    furShade: "#bf7936",
    earInner: "#ffd6b1",
    outfit: "#7d5f4d",
    outfitShade: "#5b4437",
    belly: "#fff1d7",
    cheek: "#f7af9b",
    paw: "#fff1dc",
    accent: "#f59e0b",
    eye: "#35261d",
    nose: "#8c5a3f",
    mark: "#8e5127",
  },
  dog: {
    fur: "#d4bc90",
    furShade: "#9f835b",
    earInner: "#f0bf9e",
    outfit: "#67a78d",
    outfitShade: "#45725f",
    belly: "#f7efd9",
    cheek: "#eea6a8",
    paw: "#fbf1de",
    accent: "#34d399",
    eye: "#2d261f",
    nose: "#6d5648",
    mark: "#caa67e",
  },
  cat: {
    fur: "#a8acb8",
    furShade: "#777d8c",
    earInner: "#f2c8d4",
    outfit: "#6d86ba",
    outfitShade: "#4d6392",
    belly: "#eceef3",
    cheek: "#eba9b6",
    paw: "#f2f3f7",
    accent: "#60a5fa",
    eye: "#273142",
    nose: "#676a77",
    mark: "#8e96a6",
  },
};

const statusColorByState: Record<string, string> = {
  idle: "#94a3b8",
  working: "#f59e0b",
  thinking: "#60a5fa",
  chatting: "#60a5fa",
  completed: "#34d399",
  error: "#f87171",
  player: "#3b82f6",
};

type OfficeCharacterProps = {
  name: string;
  emoji: string;
  status: string;
  position: OfficePoint;
  direction: "left" | "right" | "up" | "down";
  paletteId?: string;
  selected?: boolean;
  isPlayer?: boolean;
  typing?: boolean;
  floatingLabel?: string | null;
  onClick?: () => void;
};

export function OfficeCharacter({
  name,
  emoji,
  status,
  position,
  direction,
  paletteId = "capybara",
  selected = false,
  isPlayer = false,
  typing = false,
  floatingLabel,
  onClick,
}: OfficeCharacterProps) {
  const palette = characterPaletteById[paletteId] ?? defaultPalette;
  const statusColor = statusColorByState[isPlayer ? "player" : status] ?? statusColorByState.idle;
  const speciesClass = `species-${paletteId}`;

  return (
    <button
      type="button"
      className={`spatial-office-character ${speciesClass}${selected ? " selected" : ""}${isPlayer ? " player" : ""} direction-${direction} status-${status}`}
      aria-label={`${name} ${emoji}`}
      style={
        {
          width: TILE_SIZE,
          height: TILE_SIZE,
          transform: `translate(${position.x * TILE_SIZE}px, ${position.y * TILE_SIZE}px)`,
          zIndex: position.y + 50,
          "--character-fur": palette.fur,
          "--character-fur-shade": palette.furShade,
          "--character-ear-inner": palette.earInner,
          "--character-outfit": palette.outfit,
          "--character-outfit-shade": palette.outfitShade,
          "--character-belly": palette.belly,
          "--character-cheek": palette.cheek,
          "--character-paw": palette.paw,
          "--character-accent": palette.accent,
          "--character-eye": palette.eye,
          "--character-nose": palette.nose,
          "--character-mark": palette.mark,
          "--character-status-color": statusColor,
        } as CSSProperties
      }
      onClick={onClick}
    >
      {typing && (
        <div className="spatial-office-thought">
          <span />
          <span />
          <span />
        </div>
      )}
      {floatingLabel && <div className="spatial-office-tooltip">{floatingLabel}</div>}
      <div className="spatial-office-character-shadow" />
      <div className="spatial-office-character-sprite">
        <div className="spatial-office-character-tail" />
        <div className="spatial-office-character-arm left" />
        <div className="spatial-office-character-arm right" />
        <div className="spatial-office-character-ear left" />
        <div className="spatial-office-character-ear right" />
        <div className="spatial-office-character-status-dot" />
        <div className="spatial-office-character-head">
          <div className="spatial-office-character-face-plate" />
          <div className="spatial-office-character-mark forehead" />
          <div className="spatial-office-character-mark stripe left" />
          <div className="spatial-office-character-mark stripe right" />
          <div className="spatial-office-character-cheek left" />
          <div className="spatial-office-character-cheek right" />
          <div className="spatial-office-character-eye left" />
          <div className="spatial-office-character-eye right" />
          <div className="spatial-office-character-whisker left top" />
          <div className="spatial-office-character-whisker left bottom" />
          <div className="spatial-office-character-whisker right top" />
          <div className="spatial-office-character-whisker right bottom" />
          <div className="spatial-office-character-nose" />
          <div className="spatial-office-character-mouth" />
        </div>
        <div className="spatial-office-character-body">
          <div className="spatial-office-character-belly" />
        </div>
        <div className="spatial-office-character-foot left" />
        <div className="spatial-office-character-foot right" />
      </div>
      <div className="spatial-office-character-name">{name}</div>
    </button>
  );
}
