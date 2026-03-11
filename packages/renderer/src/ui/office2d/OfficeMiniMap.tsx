import { OFFICE_FLOOR_MAP, OFFICE_GRID_HEIGHT, OFFICE_GRID_WIDTH, type OfficePoint } from "../../data/officeLayout";
import type { AgentState } from "../../stores/useAgentStore";

type OfficeMiniMapProps = {
  player: OfficePoint;
  agents: AgentState[];
  selectedAgentId?: string | null;
};

export function OfficeMiniMap({ player, agents, selectedAgentId }: OfficeMiniMapProps) {
  return (
    <div className="spatial-office-minimap">
      <div
        className="spatial-office-minimap-grid"
        style={{
          gridTemplateColumns: `repeat(${OFFICE_GRID_WIDTH}, 1fr)`,
          gridTemplateRows: `repeat(${OFFICE_GRID_HEIGHT}, 1fr)`,
        }}
      >
        {OFFICE_FLOOR_MAP.flatMap((row, y) =>
          row.map((variant, x) => <div key={`mini-${x}-${y}`} className={`spatial-office-minimap-cell ${variant}`} />),
        )}
        <div className="spatial-office-minimap-dot player" style={{ gridColumn: player.x + 1, gridRow: player.y + 1 }} />
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`spatial-office-minimap-dot${selectedAgentId === agent.id ? " selected" : ""}`}
            style={{ gridColumn: agent.position.x + 1, gridRow: agent.position.y + 1 }}
          />
        ))}
      </div>
    </div>
  );
}
