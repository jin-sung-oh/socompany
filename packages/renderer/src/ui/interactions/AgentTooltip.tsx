import { Html } from "@react-three/drei";

interface AgentTooltipProps {
  agentName: string;
  agentRole: string;
  agentEmoji: string;
  agentStatus: string;
  position: [number, number, number];
  visible: boolean;
}

export function AgentTooltip({
  agentName,
  agentRole,
  agentEmoji,
  agentStatus,
  position,
  visible,
}: AgentTooltipProps) {
  if (!visible) return null;

  const statusColors = {
    idle: "#6B7280",
    thinking: "#3B82F6",
    working: "#F59E0B",
    completed: "#10B981",
    error: "#EF4444",
  };

  const statusLabels = {
    idle: "대기 중",
    thinking: "고민 중",
    working: "작업 중",
    completed: "완료",
    error: "오류",
  };

  const statusColor = statusColors[agentStatus as keyof typeof statusColors] || "#6B7280";
  const statusLabel = statusLabels[agentStatus as keyof typeof statusLabels] || agentStatus;

  return (
    <Html position={position} center distanceFactor={10}>
      <div className="agent-tooltip-3d">
        <div className="tooltip-header">
          <span className="tooltip-emoji">{agentEmoji}</span>
          <div className="tooltip-info">
            <div className="tooltip-name">{agentName}</div>
            <div className="tooltip-role">{agentRole}</div>
          </div>
        </div>
        <div className="tooltip-status">
          <span
            className="status-indicator"
            style={{ backgroundColor: statusColor }}
          />
          <span className="status-label">{statusLabel}</span>
        </div>
        <div className="tooltip-hint">클릭하여 대화하기</div>
      </div>
    </Html>
  );
}
