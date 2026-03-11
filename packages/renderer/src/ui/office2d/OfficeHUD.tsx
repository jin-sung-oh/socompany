import type { AgentState } from "../../stores/useAgentStore";
import { OfficeMiniMap } from "./OfficeMiniMap";

type OfficeHUDProps = {
  agents: AgentState[];
  currentZoneLabel: string;
  selectedAgentId?: string | null;
  playerPosition: { x: number; y: number };
  proximityAgent?: AgentState | null;
  proximityLabel?: string | null;
  proximityVolume?: number | null;
  talkHintVisible: boolean;
};

export function OfficeHUD({
  agents,
  currentZoneLabel,
  selectedAgentId,
  playerPosition,
  proximityAgent,
  proximityLabel,
  proximityVolume,
  talkHintVisible,
}: OfficeHUDProps) {
  return (
    <div className="spatial-office-hud">
      <aside className="spatial-office-sidebar">
        <div className="spatial-office-card-title">Active Animals</div>
        <div className="spatial-office-sidebar-list">
          {agents.map((agent) => (
            <div key={agent.id} className={`spatial-office-sidebar-item${selectedAgentId === agent.id ? " active" : ""}`}>
              <div>
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
              <span className={`spatial-office-status ${agent.status}`}>{agent.status}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="spatial-office-top-right">
        <div className="spatial-office-card">
          <div className="spatial-office-card-title">Mini Map</div>
          <OfficeMiniMap player={playerPosition} agents={agents} selectedAgentId={selectedAgentId} />
        </div>
        <div className="spatial-office-card compact">
          <div className="spatial-office-card-title">World State</div>
          <span>Location: {currentZoneLabel}</span>
          <span>{talkHintVisible && proximityAgent ? `Space: ${proximityAgent.name}와 대화` : "주변 2타일 내 NPC와 대화 가능"}</span>
          <span>{proximityAgent ? `Voice Channel: ${proximityAgent.name} · ${proximityLabel ?? "근접"} · ${proximityVolume ?? 0}%` : "Voice Channel: 대기 중"}</span>
        </div>
      </div>
    </div>
  );
}
