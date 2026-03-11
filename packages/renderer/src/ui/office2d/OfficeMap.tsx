import type { CSSProperties } from "react";
import { useMemo } from "react";
import { getSpeciesMeta } from "../../data/agentCatalog";
import {
  OFFICE_FLOOR_MAP,
  OFFICE_GRID_HEIGHT,
  OFFICE_GRID_WIDTH,
  OFFICE_OBJECTS,
  TILE_SIZE,
  type OfficePoint,
} from "../../data/officeLayout";
import type { AgentState } from "../../stores/useAgentStore";
import { OfficeCharacter } from "./OfficeCharacter";
import { OfficeObjectSprite } from "./OfficeSprites";
import { OfficeTile } from "./OfficeTile";

type PlayerState = {
  position: OfficePoint;
  direction: "left" | "right" | "up" | "down";
};

type OfficeMapProps = {
  cameraTransform: string;
  player: PlayerState;
  agents: AgentState[];
  selectedAgentId?: string | null;
  proximityAgentId?: string | null;
  activeDoorIds?: string[];
  talkTooltip?: string | null;
  onSelectAgent?: (id: string | null) => void;
};

const worldWidth = OFFICE_GRID_WIDTH * TILE_SIZE;
const worldHeight = OFFICE_GRID_HEIGHT * TILE_SIZE;

export function OfficeMap({
  cameraTransform,
  player,
  agents,
  selectedAgentId,
  proximityAgentId,
  activeDoorIds = [],
  talkTooltip,
  onSelectAgent,
}: OfficeMapProps) {
  const sortedAgents = useMemo(
    () => [...agents].sort((left, right) => left.position.y - right.position.y || left.position.x - right.position.x),
    [agents],
  );

  return (
    <div className="spatial-office-viewport">
      <div className="spatial-office-camera" style={{ transform: cameraTransform }}>
        <div className="spatial-office-world" style={{ width: worldWidth, height: worldHeight }}>
          <div
            className="spatial-office-grid"
            style={
              {
                gridTemplateColumns: `repeat(${OFFICE_GRID_WIDTH}, ${TILE_SIZE}px)`,
                gridTemplateRows: `repeat(${OFFICE_GRID_HEIGHT}, ${TILE_SIZE}px)`,
              } as CSSProperties
            }
          >
            {OFFICE_FLOOR_MAP.flatMap((row, y) => row.map((variant, x) => <OfficeTile key={`tile-${x}-${y}`} x={x} y={y} variant={variant} />))}
          </div>

          <div
            className="spatial-office-object-layer"
            style={
              {
                gridTemplateColumns: `repeat(${OFFICE_GRID_WIDTH}, ${TILE_SIZE}px)`,
                gridTemplateRows: `repeat(${OFFICE_GRID_HEIGHT}, ${TILE_SIZE}px)`,
              } as CSSProperties
            }
          >
            {OFFICE_OBJECTS.map((object) => (
              <div
                key={object.id}
                className={`spatial-office-object ${object.kind}${object.role ? " role-bound" : ""}${activeDoorIds.includes(object.id) ? " active" : ""}`}
                data-sprite="pixel"
                style={{
                  gridColumn: `${object.x + 1} / span ${object.w}`,
                  gridRow: `${object.y + 1} / span ${object.h}`,
                }}
              >
                <OfficeObjectSprite object={object} />
              </div>
            ))}
          </div>

          <div
            className="spatial-office-radius"
            style={{
              width: TILE_SIZE * 5,
              height: TILE_SIZE * 5,
              transform: `translate(${(player.position.x - 2) * TILE_SIZE}px, ${(player.position.y - 2) * TILE_SIZE}px)`,
            }}
          />

          <div className="spatial-office-entity-layer">
            <OfficeCharacter
              name="CEO"
              emoji="🧑‍💼"
              status="player"
              position={player.position}
              direction={player.direction}
              paletteId="ceo"
              isPlayer
              floatingLabel={talkTooltip}
            />

            {sortedAgents.map((agent) => {
              const species = getSpeciesMeta(agent.species);
              const isTyping = agent.status === "thinking" || agent.status === "chatting";
              const isSelected = selectedAgentId === agent.id;
              const isTalkable = proximityAgentId === agent.id;

              return (
                <div key={agent.id} className={`spatial-office-agent-wrapper${isTalkable ? " talkable" : ""}`}>
                  <OfficeCharacter
                    name={agent.name}
                    emoji={species.emoji}
                    status={agent.status}
                    position={agent.position}
                    direction={agent.direction}
                    paletteId={agent.species}
                    selected={isSelected}
                    typing={isTyping}
                    onClick={() => onSelectAgent?.(agent.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
