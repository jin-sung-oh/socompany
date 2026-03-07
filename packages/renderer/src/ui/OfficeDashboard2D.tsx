import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAgentStore, type AgentState } from "../stores/useAgentStore";
import { getSpeciesMeta } from "../data/agentCatalog";
import { OFFICE_DOORS, OFFICE_SEATS, OFFICE_WALLS, OFFICE_ZONES, PLAYER_SPAWN, getSeatByRole, type OfficeSeat } from "../data/officeLayout";
import {
  canOccupyOfficePosition,
  clampOfficePosition,
  distanceBetween,
  findNearestDoor,
  getDirectionFromVector,
  getDoorInteractionLabel,
  getDoorTransitionTarget,
  getZoneForPosition,
  moveWithinOffice,
} from "../data/officeNavigation";
import { MapPin, Zap } from "lucide-react";

type OfficeDashboard2DProps = {
  embedded?: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
};

type PlayerState = {
  position: { x: number; y: number };
  direction: "left" | "right" | "up" | "down";
  sittingSeatId: string | null;
};

const interactionRange = 8;
const seatSnapRange = 7;
const movementSpeed = 1.25;

const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);

const speciesPalette: Record<AgentState["species"], { primary: string; accent: string }> = {
  capybara: { primary: "#9d7a5c", accent: "#5c4333" },
  fox: { primary: "#ee8b54", accent: "#8c4928" },
  tiger: { primary: "#f2a63b", accent: "#82521f" },
  pig: { primary: "#e8a0b2", accent: "#93556a" },
  cat: { primary: "#8fa7da", accent: "#445d8a" },
  dog: { primary: "#8bb27a", accent: "#4f7044" },
};

const statusColorMap: Record<AgentState["status"], string> = {
  idle: "#64748b",
  thinking: "#3b82f6",
  working: "#f59e0b",
  completed: "#22c55e",
  error: "#ef4444",
  chatting: "#8b5cf6",
};

const isTypingElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};

const compactTaskLabel = (agent: AgentState) => {
  const label = agent.currentTask?.title ?? (agent.status === "thinking" ? "아이디어 정리" : "");
  if (!label) {
    return "";
  }
  return label.length > 22 ? `${label.slice(0, 21)}…` : label;
};

const MiniAvatar = ({
  label,
  moving,
  selected,
  seated,
  statusColor,
  primaryColor,
  accentColor,
  badge,
  task,
  isPlayer = false,
}: {
  label: string;
  moving: boolean;
  selected: boolean;
  seated: boolean;
  statusColor: string;
  primaryColor: string;
  accentColor: string;
  badge: string;
  task?: string;
  isPlayer?: boolean;
}) => {
  const style = {
    "--avatar-primary": primaryColor,
    "--avatar-accent": accentColor,
    "--avatar-status": statusColor,
  } as CSSProperties;

  return (
    <div className={`gather-avatar${moving ? " moving" : ""}${selected ? " selected" : ""}${seated ? " seated" : ""}${isPlayer ? " player" : ""}`} style={style}>
      <div className="gather-avatar-shadow" />
      <div className="gather-avatar-figure">
        <div className="gather-avatar-head">
          <span>{badge}</span>
        </div>
        <div className="gather-avatar-body" />
        <div className="gather-avatar-status-dot" />
      </div>
      {task && <div className="gather-task-bubble">{task}</div>}
      <div className="gather-name-tag">{label}</div>
    </div>
  );
};

const DeskPod = ({ seat, occupied, nearby }: { seat: OfficeSeat; occupied: boolean; nearby: boolean }) => (
  <div className="gather-desk-pod" style={{ left: `${seat.deskX}%`, top: `${seat.deskY}%`, width: `${seat.deskW}%`, height: `${seat.deskH}%` }}>
    <div className="gather-desk-surface" />
    <div className="gather-monitor" />
    <div className={`gather-chair${occupied ? " occupied" : ""}${nearby ? " nearby" : ""}`} style={{ left: `${seat.x}%`, top: `${seat.y}%` }} />
  </div>
);

const DecorativeFurniture = () => (
  <>
    <div className="gather-sofa gather-sofa-left" />
    <div className="gather-sofa gather-sofa-right" />
    <div className="gather-plant gather-plant-a" />
    <div className="gather-plant gather-plant-b" />
    <div className="gather-plant gather-plant-c" />
    <div className="gather-coffee-machine" />
    <div className="gather-meeting-table" />
  </>
);

export function OfficeDashboard2D({ embedded = false, selectedAgentId, onSelectAgent }: OfficeDashboard2DProps) {
  const agents = useAgentStore((state) => state.agents);
  const moveAgents = useAgentStore((state) => state.moveAgents);
  const setOfficePlayerPosition = useAgentStore((state) => state.setOfficePlayerPosition);
  const [isPaused, setIsPaused] = useState(false);
  const [player, setPlayer] = useState<PlayerState>({
    position: PLAYER_SPAWN,
    direction: "down",
    sittingSeatId: null,
  });
  const [playerIsMoving, setPlayerIsMoving] = useState(false);
  const [internalSelectedAgentId, setInternalSelectedAgentId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(["[시스템] Gather 스타일 오피스 레이아웃 로드 완료", "[시스템] 사장 아바타로 직접 걸어다닐 수 있습니다."]);
  const logRef = useRef<HTMLDivElement>(null);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const controlled = typeof selectedAgentId !== "undefined";
  const activeSelectedAgentId = controlled ? selectedAgentId : internalSelectedAgentId;

  const seatedAgents = useMemo(
    () =>
      agents
        .map((agent) => {
          const seat = getSeatByRole(agent.role);
          if (!seat) {
            return null;
          }

          const seatDistance = distanceBetween(agent.position, seat);
          const isSeated = seatDistance <= 2.2 && agent.targetPosition === null && ["working", "thinking", "completed"].includes(agent.status);
          if (!isSeated) {
            return null;
          }

          return { agentId: agent.id, seatId: seat.id };
        })
        .filter((value): value is { agentId: string; seatId: string } => Boolean(value)),
    [agents],
  );

  const seatedAgentSeatMap = useMemo(() => new Map(seatedAgents.map((item) => [item.agentId, item.seatId])), [seatedAgents]);
  const occupiedSeatIds = useMemo(() => new Set(seatedAgents.map((item) => item.seatId)), [seatedAgents]);
  const previousZoneIdRef = useRef<string | null>(null);

  const currentZone = useMemo(
    () => getZoneForPosition(player.position),
    [player.position],
  );

  const nearestDoor = useMemo(() => findNearestDoor(player.position, 5.5), [player.position]);

  useEffect(() => {
    if (!player.sittingSeatId || !occupiedSeatIds.has(player.sittingSeatId)) {
      return;
    }

    setPlayer((prev) => ({
      ...prev,
      sittingSeatId: null,
      position: clampOfficePosition(prev.position.x + 5, prev.position.y + 5),
    }));
  }, [occupiedSeatIds, player.sittingSeatId]);

  useEffect(() => {
    setOfficePlayerPosition(player.position);
  }, [player.position, setOfficePlayerPosition]);

  useEffect(() => () => setOfficePlayerPosition(null), [setOfficePlayerPosition]);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const interval = setInterval(() => {
      moveAgents();
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, moveAgents]);

  useEffect(() => {
    const interval = setInterval(() => {
      const keys = activeKeysRef.current;
      if (isPaused || player.sittingSeatId || keys.size === 0) {
        setPlayerIsMoving(false);
        return;
      }

      let dx = 0;
      let dy = 0;

      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
        dy -= 1;
      }
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
        dy += 1;
      }
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
        dx -= 1;
      }
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
        dx += 1;
      }

      if (dx === 0 && dy === 0) {
        setPlayerIsMoving(false);
        return;
      }

      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const vx = (dx / distance) * movementSpeed;
      const vy = (dy / distance) * movementSpeed;
      const nextPosition = moveWithinOffice(player.position, { x: vx, y: vy }, {
        blockedPositions: agents.map((agent) => agent.position),
        collisionRadius: 5.2,
      });
      const didMove = distanceBetween(player.position, nextPosition) > 0.01;

      if (didMove) {
        setPlayer((prev) => ({
          position: nextPosition,
          direction: getDirectionFromVector(vx, vy, prev.direction),
          sittingSeatId: null,
        }));
      } else {
        setPlayer((prev) => ({
          ...prev,
          direction: getDirectionFromVector(vx, vy, prev.direction),
        }));
      }
      setPlayerIsMoving(didMove);
    }, 32);

    return () => clearInterval(interval);
  }, [agents, isPaused, player.position, player.sittingSeatId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) {
        return;
      }

      if (movementKeys.has(event.key)) {
        activeKeysRef.current.add(event.key);
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (movementKeys.has(event.key)) {
        activeKeysRef.current.delete(event.key);
        if (activeKeysRef.current.size === 0) {
          setPlayerIsMoving(false);
        }
      }
    };

    const handleBlur = () => {
      activeKeysRef.current.clear();
      setPlayerIsMoving(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!logRef.current) {
      return;
    }
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (embedded) {
      return;
    }

    const activeAgents = agents.filter((agent) => agent.status === "working" || agent.status === "thinking");
    if (activeAgents.length === 0) {
      return;
    }

    setLogs((prev) => {
      const nextLine = `[${new Date().toLocaleTimeString()}] ${activeAgents.map((agent) => `${agent.name}:${agent.status}`).join(", ")}`;
      if (prev[prev.length - 1] === nextLine) {
        return prev;
      }
      return [...prev.slice(-30), nextLine];
    });
  }, [agents, embedded]);

  useEffect(() => {
    if (embedded || !currentZone || previousZoneIdRef.current === currentZone.id) {
      return;
    }

    previousZoneIdRef.current = currentZone.id;
    setLogs((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${currentZone.label} 구역으로 이동했습니다.`]);
  }, [currentZone, embedded]);

  const nearestSeat = useMemo(() => {
    if (player.sittingSeatId) {
      return OFFICE_SEATS.find((seat) => seat.id === player.sittingSeatId) ?? null;
    }

    const availableSeats = OFFICE_SEATS
      .filter((seat) => !occupiedSeatIds.has(seat.id))
      .map((seat) => ({ seat, distance: distanceBetween(player.position, seat) }))
      .filter((item) => item.distance <= seatSnapRange)
      .sort((left, right) => left.distance - right.distance);

    return availableSeats[0]?.seat ?? null;
  }, [occupiedSeatIds, player.position, player.sittingSeatId]);

  const nearestAgent = useMemo(() => {
    const candidates = agents
      .map((agent) => ({ agent, distance: distanceBetween(player.position, agent.position) }))
      .filter((item) => item.distance <= interactionRange)
      .sort((left, right) => left.distance - right.distance);

    return candidates[0]?.agent ?? null;
  }, [agents, player.position]);

  const interactionHint = useMemo(() => {
    if (player.sittingSeatId) {
      return "E: 자리에서 일어나기";
    }
    if (nearestSeat) {
      return `E: ${nearestSeat.label}에 앉기`;
    }
    if (nearestDoor) {
      return `E: ${getDoorInteractionLabel(nearestDoor, player.position)}`;
    }
    if (nearestAgent) {
      return `E: ${nearestAgent.name} 살펴보기`;
    }
    return "WASD / Arrow Keys 로 이동";
  }, [nearestAgent, nearestDoor, nearestSeat, player.position, player.sittingSeatId]);

  const selectAgent = (id: string | null) => {
    if (!controlled) {
      setInternalSelectedAgentId(id);
    }
    onSelectAgent?.(id);
  };

  const handleInteract = () => {
    if (player.sittingSeatId) {
      setPlayer((prev) => ({
        ...prev,
        sittingSeatId: null,
        position: clampOfficePosition(prev.position.x + 4, prev.position.y + 5),
      }));
      return;
    }

    if (nearestSeat) {
      setPlayer((prev) => ({
        ...prev,
        position: { x: nearestSeat.x, y: nearestSeat.y },
        direction: "down",
        sittingSeatId: nearestSeat.id,
      }));
      return;
    }

    if (nearestDoor) {
      const nextDoorPosition = getDoorTransitionTarget(nearestDoor, player.position);
      if (!canOccupyOfficePosition(nextDoorPosition, { blockedPositions: agents.map((agent) => agent.position), collisionRadius: 5.2 })) {
        return;
      }
      setPlayer((prev) => ({
        ...prev,
        position: nextDoorPosition,
        direction: getDirectionFromVector(nextDoorPosition.x - prev.position.x, nextDoorPosition.y - prev.position.y, prev.direction),
      }));
      if (!embedded) {
        setLogs((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${getDoorInteractionLabel(nearestDoor, player.position)}`]);
      }
      return;
    }

    if (nearestAgent) {
      selectAgent(nearestAgent.id);
    }
  };

  useEffect(() => {
    const handleInteractKey = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) {
        return;
      }

      if ((event.key === "e" || event.key === "E" || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        handleInteract();
      }
    };

    window.addEventListener("keydown", handleInteractKey);
    return () => window.removeEventListener("keydown", handleInteractKey);
  }, [handleInteract]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === activeSelectedAgentId) ?? null, [activeSelectedAgentId, agents]);

  return (
    <div className={`pixel-office-container${embedded ? " embedded" : ""}`} onClick={() => selectAgent(null)}>
      <div className="pixel-office-header">
        <h1>{embedded ? "Gather Office" : "Animal Office"}</h1>
        <div className="pixel-office-header-meta">
          <Zap size={15} color="#facc15" />
          <span>{embedded ? "desk pod와 room이 살아있는 팀 오피스" : "6종 동물, 7개 에이전트 협업 시뮬레이션"}</span>
        </div>
      </div>

      <div className={`pixel-office-map gather-office-map${embedded ? " embedded" : ""}`}>
        {OFFICE_ZONES.map((zone) => (
          <div
            key={zone.id}
            className={`gather-zone ${zone.variant}${currentZone?.id === zone.id ? " active" : ""}`}
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
          >
            <div className="gather-zone-label">{zone.label}</div>
          </div>
        ))}

        {OFFICE_WALLS.map((wall) => (
          <div key={wall.id} className="gather-wall" style={{ left: `${wall.x}%`, top: `${wall.y}%`, width: `${wall.w}%`, height: `${wall.h}%` }} />
        ))}

        {OFFICE_DOORS.map((door) => (
          <div
            key={door.id}
            className={`gather-door${nearestDoor?.id === door.id ? " nearby" : ""}`}
            style={{ left: `${door.x}%`, top: `${door.y}%`, width: `${door.w}%`, height: `${door.h}%` }}
          />
        ))}

        <DecorativeFurniture />

        {OFFICE_SEATS.map((seat) => {
          const occupied = occupiedSeatIds.has(seat.id) || player.sittingSeatId === seat.id;
          const nearby = !player.sittingSeatId && distanceBetween(player.position, seat) <= seatSnapRange;
          return <DeskPod key={seat.id} seat={seat} occupied={occupied} nearby={nearby} />;
        })}

        <div
          className={`pixel-player${player.sittingSeatId ? " sitting" : ""}`}
          style={{
            left: `${player.position.x}%`,
            top: `${player.position.y + (player.sittingSeatId ? 2.2 : 0)}%`,
            transform: `translate(-50%, -50%) scaleX(${player.direction === "left" ? -1 : 1})`,
            zIndex: Math.floor(player.position.y) + 120,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <MiniAvatar
            label="사장"
            moving={playerIsMoving && !player.sittingSeatId}
            selected={false}
            seated={Boolean(player.sittingSeatId)}
            statusColor="#2563eb"
            primaryColor="#f9fafb"
            accentColor="#2563eb"
            badge="CEO"
            isPlayer
          />
        </div>

        {agents.map((agent) => {
          const species = getSpeciesMeta(agent.species);
          const palette = speciesPalette[agent.species];
          const isSelected = activeSelectedAgentId === agent.id;
          const isSeated = seatedAgentSeatMap.has(agent.id);
          return (
            <div
              key={agent.id}
              className={`pixel-agent${isSelected ? " active" : ""}${isSeated ? " seated" : ""}`}
              style={{
                left: `${agent.position.x}%`,
                top: `${agent.position.y + (isSeated ? 2.2 : 0)}%`,
                transform: `translate(-50%, -50%) scaleX(${agent.direction === "left" ? -1 : 1})`,
                zIndex: Math.floor(agent.position.y) + 100,
              }}
              onClick={(event) => {
                event.stopPropagation();
                selectAgent(agent.id);
                if (!embedded) {
                  setLogs((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${agent.name} 자리로 이동`]);
                }
              }}
            >
              <MiniAvatar
                label={agent.name}
                moving={Boolean(agent.targetPosition)}
                selected={isSelected}
                seated={isSeated}
                statusColor={statusColorMap[agent.status]}
                primaryColor={palette.primary}
                accentColor={palette.accent}
                badge={species.label.slice(0, 1)}
                task={compactTaskLabel(agent)}
              />
            </div>
          );
        })}

        <div className="pixel-office-hud gather-office-hud">
          <div className="gather-office-hud-row">
            <MapPin size={14} />
            <strong>Move & Interact</strong>
          </div>
          <span>현재 구역: {currentZone?.label ?? "Walkway"}</span>
          <span>{interactionHint}</span>
          <span>근처 팀원에게 다가가면 상호작용할 수 있습니다.</span>
        </div>

        {selectedAgent && (
          <div className={`pixel-speech-bubble pixel-agent-card gather-agent-card${embedded ? " embedded" : ""}`} onClick={(event) => event.stopPropagation()}>
            <div className="pixel-agent-card-header">
              <div className="gather-agent-card-badge">{getSpeciesMeta(selectedAgent.species).label.slice(0, 1)}</div>
              <div style={{ flex: 1 }}>
                <div className="pixel-agent-card-title">{selectedAgent.name}</div>
                <div className="pixel-agent-card-meta">{getSpeciesMeta(selectedAgent.species).label} · {selectedAgent.role}</div>
              </div>
            </div>
            <div className="pixel-agent-card-body">
              <strong>상태:</strong> {selectedAgent.status}<br />
              <strong>작업:</strong> {selectedAgent.currentTask?.title ?? "없음"}<br />
              <strong>좌석:</strong> {seatedAgentSeatMap.has(selectedAgent.id) ? "착석 중" : "이동 중 또는 대기"}<br />
              <strong>페르소나:</strong> {selectedAgent.persona?.description ?? "설명 없음"}
            </div>
          </div>
        )}
      </div>

      {!embedded && (
        <div className="pixel-ui-bottom">
          <div className="pixel-log-box" ref={logRef}>
            {logs.map((log, index) => (
              <div key={`${log}-${index}`} style={{ marginBottom: "4px", opacity: 1 - index / 40 }}>{log}</div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "220px", padding: "15px" }}>
            <button className="pixel-btn" style={{ flex: 1, background: isPaused ? "#27ae60" : "#c0392b" }} onClick={() => setIsPaused((prev) => !prev)}>
              {isPaused ? "시뮬레이션 재개" : "시뮬레이션 정지"}
            </button>
            <button
              className="pixel-btn"
              style={{ flex: 1 }}
              onClick={() => {
                setPlayer({
                  position: PLAYER_SPAWN,
                  direction: "down",
                  sittingSeatId: null,
                });
                setLogs((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] 사장 아바타 위치를 초기화했습니다.`]);
              }}
            >
              사장 위치 초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
