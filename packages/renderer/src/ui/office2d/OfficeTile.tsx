import type { CSSProperties } from "react";
import type { OfficeFloorVariant } from "../../data/officeLayout";
import { OfficeFloorSprite } from "./OfficeSprites";

type OfficeTileProps = {
  x: number;
  y: number;
  variant: OfficeFloorVariant;
};

export function OfficeTile({ x, y, variant }: OfficeTileProps) {
  return (
    <div
      className={`spatial-office-tile ${variant}`}
      data-sprite="pixel"
      style={
        {
          gridColumn: `${x + 1} / span 1`,
          gridRow: `${y + 1} / span 1`,
          "--tile-x": x,
          "--tile-y": y,
        } as CSSProperties
      }
    >
      <OfficeFloorSprite variant={variant} />
    </div>
  );
}
