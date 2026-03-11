import { useEffect, useMemo, useRef, useState } from "react";
import {
  OFFICE_GRID_HEIGHT,
  OFFICE_GRID_WIDTH,
  PLAYER_SPAWN,
  TILE_SIZE,
  type OfficePoint,
} from "../data/officeLayout";
import {
  canOccupyOfficePosition,
  clampOfficePosition,
  distanceBetween,
  getDoorLaneForPosition,
  getLocationLabel,
  getZoneForPosition,
  moveWithinOffice,
} from "../data/officeNavigation";
import { useAgentStore } from "../stores/useAgentStore";
import { useChatStore } from "../stores/useChatStore";
import { OfficeConversationPanel } from "./office2d/OfficeConversationPanel";
import { OfficeHUD } from "./office2d/OfficeHUD";
import { OfficeMap } from "./office2d/OfficeMap";
import { buildSpatialConversationPrompt, parseSpatialConversationResponse } from "./office2d/spatialPrompt";

type OfficeDashboard2DProps = {
  embedded?: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
};

type PlayerState = {
  position: OfficePoint;
  direction: "left" | "right" | "up" | "down";
};

const detectionRadius = 2;
const moveIntervalMs = 220;
const defaultViewportSize = { width: 800, height: 620 };

const isTypingElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};

const normalizeMovementKey = (key: string): PlayerState["direction"] | null => {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
};

const getDirectionalStep = (direction: PlayerState["direction"]) => {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
};

const getTimeOfDayLabel = () => {
  const hour = new Date().getHours();
  if (hour < 6) {
    return "night";
  }
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
};

const getProximityLabel = (distance: number) => {
  if (distance <= 0.75) {
    return "바로 옆 채널";
  }
  if (distance <= 1.25) {
    return "근거리 채널";
  }
  return "멀리서 들림";
};

const getProximityVolume = (distance: number) =>
  Math.min(100, Math.max(18, Math.round((1 - distance / (detectionRadius + 0.25)) * 100)));

const summarizeHistory = (messages: Array<{ role: "user" | "assistant"; content: string }>) =>
  messages
    .slice(-4)
    .map((message) => `${message.role === "user" ? "CEO" : "Agent"}: ${message.content.replace(/\s+/g, " ").slice(0, 80)}`)
    .join(" | ");

const getNearbyWalkTarget = (origin: OfficePoint, blockedPositions: OfficePoint[]) => {
  const candidates = [
    { x: origin.x + 1, y: origin.y },
    { x: origin.x - 1, y: origin.y },
    { x: origin.x, y: origin.y + 1 },
    { x: origin.x, y: origin.y - 1 },
  ]
    .map((candidate) => clampOfficePosition(candidate.x, candidate.y))
    .filter((candidate) => canOccupyOfficePosition(candidate, { blockedPositions }));

  return candidates[0] ?? null;
};

export function OfficeDashboard2D({ embedded = false, selectedAgentId, onSelectAgent }: OfficeDashboard2DProps) {
  const agents = useAgentStore((state) => state.agents);
  const moveAgents = useAgentStore((state) => state.moveAgents);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const setOfficePlayerPosition = useAgentStore((state) => state.setOfficePlayerPosition);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const addMessage = useChatStore((state) => state.addMessage);

  const [player, setPlayer] = useState<PlayerState>({
    position: PLAYER_SPAWN,
    direction: "down",
  });
  const [viewportSize, setViewportSize] = useState(defaultViewportSize);
  const [internalSelectedAgentId, setInternalSelectedAgentId] = useState<string | null>(null);
  const [conversationAgentId, setConversationAgentId] = useState<string | null>(null);
  const [dismissedProximityAgentId, setDismissedProximityAgentId] = useState<string | null>(null);
  const [conversationInput, setConversationInput] = useState("");
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const activeDirectionsRef = useRef<PlayerState["direction"][]>([]);
  const playerRef = useRef(player);
  const agentsRef = useRef(agents);
  const viewportRef = useRef<HTMLDivElement>(null);
  const controlled = typeof selectedAgentId !== "undefined";
  const activeSelectedAgentId = controlled ? selectedAgentId : internalSelectedAgentId;

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    setOfficePlayerPosition(player.position);
  }, [player.position, setOfficePlayerPosition]);

  useEffect(() => () => setOfficePlayerPosition(null), [setOfficePlayerPosition]);

  useEffect(() => {
    if (!viewportRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const viewport = viewportRef.current;
    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth || defaultViewportSize.width,
        height: viewport.clientHeight || defaultViewportSize.height,
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      moveAgents();
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [moveAgents]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const direction = activeDirectionsRef.current[activeDirectionsRef.current.length - 1];
      if (!direction) {
        return;
      }

      const currentPlayer = playerRef.current;
      const nextPosition = moveWithinOffice(currentPlayer.position, getDirectionalStep(direction), {
        blockedPositions: agentsRef.current.map((agent) => agent.position),
      });

      setPlayer((prev) => {
        if (
          prev.position.x === nextPosition.x &&
          prev.position.y === nextPosition.y &&
          prev.direction === direction
        ) {
          return prev;
        }

        return {
          position: nextPosition,
          direction,
        };
      });
    }, moveIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const selectAgent = (id: string | null) => {
    if (!controlled) {
      setInternalSelectedAgentId(id);
    }
    onSelectAgent?.(id);
  };

  const proximityState = useMemo(() => {
    const candidate = agents
      .map((agent) => ({ agent, distance: distanceBetween(player.position, agent.position) }))
      .filter((item) => item.distance <= detectionRadius)
      .sort((left, right) => left.distance - right.distance)[0];

    if (!candidate) {
      return null;
    }

    return {
      agent: candidate.agent,
      distance: candidate.distance,
      label: getProximityLabel(candidate.distance),
      volume: getProximityVolume(candidate.distance),
    };
  }, [agents, player.position]);
  const proximityAgent = proximityState?.agent ?? null;

  const currentZoneLabel = getZoneForPosition(player.position)?.label ?? getLocationLabel(player.position);
  const talkTooltip = proximityAgent ? `Press [Space] to talk · ${proximityState?.label ?? "근접 채널"}` : null;
  const currentConversationAgent = agents.find((agent) => agent.id === (conversationAgentId ?? "")) ?? null;
  const proximityPreview = !currentConversationAgent && Boolean(proximityAgent) && dismissedProximityAgentId !== proximityAgent?.id;
  const panelAgent = currentConversationAgent ?? (proximityPreview ? proximityAgent : null);
  const conversationMessages = panelAgent ? messagesByAgent[panelAgent.id] ?? [] : [];
  const panelLocationLabel = panelAgent ? getLocationLabel(panelAgent.position) : null;
  const panelProximityLabel = panelAgent?.id === proximityAgent?.id ? proximityState?.label ?? null : "직접 대화 유지 중";
  const panelProximityVolume = panelAgent?.id === proximityAgent?.id ? proximityState?.volume ?? null : null;
  const activeDoorIds = useMemo(() => {
    const doorIds = new Set<string>();
    const trackedPositions = [
      player.position,
      ...agents.flatMap((agent) => (agent.targetPosition ? [agent.position, agent.targetPosition] : [agent.position])),
    ];

    trackedPositions.forEach((position) => {
      const door = getDoorLaneForPosition(position);
      if (door) {
        doorIds.add(door.id);
      }
    });

    return [...doorIds];
  }, [agents, player.position]);

  useEffect(() => {
    if (!proximityAgent) {
      setDismissedProximityAgentId(null);
    }
  }, [proximityAgent]);

  const cameraTransform = useMemo(() => {
    const worldWidth = OFFICE_GRID_WIDTH * TILE_SIZE;
    const worldHeight = OFFICE_GRID_HEIGHT * TILE_SIZE;
    const playerPixelX = player.position.x * TILE_SIZE + TILE_SIZE / 2;
    const playerPixelY = player.position.y * TILE_SIZE + TILE_SIZE / 2;
    const minX = Math.min(0, viewportSize.width - worldWidth);
    const minY = Math.min(0, viewportSize.height - worldHeight);
    const x = Math.min(0, Math.max(minX, viewportSize.width / 2 - playerPixelX));
    const y = Math.min(0, Math.max(minY, viewportSize.height / 2 - playerPixelY));

    return `translate3d(${x}px, ${y}px, 0)`;
  }, [player.position, viewportSize]);

  const handleOpenConversation = () => {
    if (!proximityAgent) {
      return;
    }

    setConversationAgentId(proximityAgent.id);
    setDismissedProximityAgentId(null);
    setConversationError(null);
    selectAgent(proximityAgent.id);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) {
        return;
      }

      const direction = normalizeMovementKey(event.key);
      if (direction) {
        activeDirectionsRef.current = [...activeDirectionsRef.current.filter((item) => item !== direction), direction];
        setPlayer((prev) => (prev.direction === direction ? prev : { ...prev, direction }));
        event.preventDefault();
        return;
      }

      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        handleOpenConversation();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const direction = normalizeMovementKey(event.key);
      if (!direction) {
        return;
      }

      activeDirectionsRef.current = activeDirectionsRef.current.filter((item) => item !== direction);
    };

    const handleBlur = () => {
      activeDirectionsRef.current = [];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [proximityAgent]);

  const handleSendConversation = async () => {
    if (!window.kafi || !currentConversationAgent || !conversationInput.trim() || conversationLoading) {
      return;
    }

    const userMessage = conversationInput.trim();
    const nearbyAgents = agents.filter(
      (agent) => agent.id !== currentConversationAgent.id && distanceBetween(agent.position, currentConversationAgent.position) <= detectionRadius,
    );
    const userHistorySummary = summarizeHistory(conversationMessages);
    const prompt = buildSpatialConversationPrompt({
      agent: currentConversationAgent,
      userMessage,
      currentLocation: getLocationLabel(currentConversationAgent.position),
      nearbyAgents,
      timeOfDay: getTimeOfDayLabel(),
      userHistorySummary,
    });

    setConversationLoading(true);
    setConversationError(null);
    addMessage(currentConversationAgent.id, "user", userMessage);
    setConversationInput("");

    const previousStatus = currentConversationAgent.status;
    if (previousStatus === "idle") {
      updateAgentStatus(currentConversationAgent.id, "chatting");
    }

    try {
      const response = await window.kafi.ollamaChat({
        message: prompt,
        agentId: currentConversationAgent.id,
      });

      const responseText = response.response || response.error || "응답을 받지 못했습니다.";
      const parsed = parseSpatialConversationResponse(responseText);
      addMessage(currentConversationAgent.id, "assistant", parsed.message);

      if (parsed.action === "walk") {
        const walkTarget = getNearbyWalkTarget(player.position, agents.filter((agent) => agent.id !== currentConversationAgent.id).map((agent) => agent.position));
        if (walkTarget) {
          updateAgent(currentConversationAgent.id, {
            targetPosition: walkTarget,
            behavior: "wandering",
          });
        }
      }

      if (parsed.action === "wave" && previousStatus === "idle") {
        updateAgentStatus(currentConversationAgent.id, "chatting");
        window.setTimeout(() => {
          updateAgentStatus(currentConversationAgent.id, "idle");
        }, 1200);
      } else if (previousStatus === "idle") {
        updateAgentStatus(currentConversationAgent.id, "idle");
      }
    } catch {
      setConversationError("대화 중 오류가 발생했습니다.");
      if (previousStatus === "idle") {
        updateAgentStatus(currentConversationAgent.id, "idle");
      }
    } finally {
      setConversationLoading(false);
    }
  };

  return (
    <div className={`spatial-office-shell${embedded ? " embedded" : ""}`}>
      <div ref={viewportRef} className="spatial-office-stage-shell">
        <OfficeMap
          cameraTransform={cameraTransform}
          player={player}
          agents={agents}
          selectedAgentId={activeSelectedAgentId}
          proximityAgentId={proximityAgent?.id ?? null}
          activeDoorIds={activeDoorIds}
          talkTooltip={talkTooltip}
          onSelectAgent={selectAgent}
        />

        <OfficeHUD
          agents={agents}
          currentZoneLabel={currentZoneLabel}
          selectedAgentId={activeSelectedAgentId}
          playerPosition={player.position}
          proximityAgent={proximityAgent}
          proximityLabel={proximityState?.label ?? null}
          proximityVolume={proximityState?.volume ?? null}
          talkHintVisible={Boolean(proximityAgent)}
        />

        <OfficeConversationPanel
          open={Boolean(currentConversationAgent || proximityPreview)}
          preview={proximityPreview}
          agent={panelAgent}
          messages={conversationMessages}
          input={conversationInput}
          loading={conversationLoading}
          error={conversationError}
          locationLabel={panelLocationLabel}
          proximityLabel={panelProximityLabel}
          proximityVolume={panelProximityVolume}
          onChangeInput={setConversationInput}
          onStartConversation={handleOpenConversation}
          onClose={() => {
            if (currentConversationAgent) {
              setConversationAgentId(null);
            } else if (proximityAgent) {
              setDismissedProximityAgentId(proximityAgent.id);
            }
            setConversationError(null);
          }}
          onSend={() => void handleSendConversation()}
        />
      </div>

      {!embedded && (
        <div className="spatial-office-footer">
          <span>WASD / Arrow Keys: Move</span>
          <span>Space: Talk</span>
          <button
            type="button"
            onClick={() => {
              setPlayer({ position: PLAYER_SPAWN, direction: "down" });
              setConversationAgentId(null);
            }}
          >
            Reset Position
          </button>
        </div>
      )}
    </div>
  );
}
