import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  OFFICE_FLOOR_MAP,
  OFFICE_GRID_HEIGHT,
  OFFICE_GRID_WIDTH,
  OFFICE_OBJECTS,
  OFFICE_SEATS,
  OFFICE_ZONES,
  type OfficeFloorVariant,
  type OfficeObject,
  type OfficePoint,
  type OfficeZone,
} from "../data/officeLayout";
import {
  canOccupyOfficePosition,
  clampOfficePosition,
  distanceBetween,
  getLocationLabel,
} from "../data/officeNavigation";
import { useAgentStore } from "../stores/useAgentStore";
import { useChatStore } from "../stores/useChatStore";
import { OfficeConversationPanel } from "./office2d/OfficeConversationPanel";
import { buildSpatialConversationPrompt, parseSpatialConversationResponse } from "./office2d/spatialPrompt";
import { AnimalEmployee3D } from "./office3d/AnimalEmployee3D";

type OfficeDashboard3DProps = {
  embedded?: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (id: string | null) => void;
};

const TILE_WORLD_SIZE = 1.8;
const FLOOR_THICKNESS = 0.12;
const WORLD_WIDTH = OFFICE_GRID_WIDTH * TILE_WORLD_SIZE;
const WORLD_DEPTH = OFFICE_GRID_HEIGHT * TILE_WORLD_SIZE;

const floorPalette: Record<OfficeFloorVariant, string> = {
  wood: "#d8b894",
  stone: "#d7dbe0",
  carpet: "#8da6a2",
  corridor: "#c9d6dc",
  focus: "#bdc5d1",
};

const zoneTintPalette: Record<OfficeZone["variant"], string> = {
  lounge: "#6aa784",
  "open-pod": "#c38f53",
  meeting: "#6b8ea8",
  focus: "#7f8ab4",
  cafe: "#a88657",
  corridor: "#9aaeb8",
};

const roleAccentColors: Record<string, string> = {
  "PM Agent": "#ffd166",
  "Research Agent": "#69b7ff",
  "Trend Agent": "#7cdbb4",
  "Planning Agent": "#ff9b54",
  "Document Agent": "#ff86b6",
  "Coding Agent": "#a991ff",
  "Test Agent": "#8dd36f",
};

const overlayPanelStyle = {
  borderRadius: "18px",
  background: "rgba(14, 18, 24, 0.72)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 18px 44px rgba(0, 0, 0, 0.22)",
  color: "#f6f7fb",
  backdropFilter: "blur(12px)",
};

const infoLabelStyle = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "rgba(255,255,255,0.56)",
};

const overviewButtonStyle = {
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "#f8fafc",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const zoneLabelStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#f7fbff",
  background: "rgba(18, 24, 30, 0.74)",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "0 12px 26px rgba(0,0,0,0.2)",
  pointerEvents: "none" as const,
};

const toWorldPosition = (gridX: number, gridY: number, lift = 0): [number, number, number] => [
  gridX * TILE_WORLD_SIZE - WORLD_WIDTH / 2 + TILE_WORLD_SIZE / 2,
  lift,
  gridY * TILE_WORLD_SIZE - WORLD_DEPTH / 2 + TILE_WORLD_SIZE / 2,
];

const toRectCenter = (object: Pick<OfficeObject | OfficeZone, "x" | "y" | "w" | "h">, lift = 0) =>
  toWorldPosition(object.x + object.w / 2 - 0.5, object.y + object.h / 2 - 0.5, lift);

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

function CameraRig({
  focusPosition,
  zoomedIn,
}: {
  focusPosition: [number, number, number] | null;
  zoomedIn: boolean;
}) {
  const { camera } = useThree();
  const desiredTarget = useMemo(
    () => new THREE.Vector3(...(focusPosition ?? [0, 0.4, 0])),
    [focusPosition],
  );
  const desiredPosition = useMemo(
    () =>
      new THREE.Vector3(
        (focusPosition?.[0] ?? 0) + (zoomedIn ? 9 : 0),
        zoomedIn ? 13.5 : 28,
        (focusPosition?.[2] ?? 0) + (zoomedIn ? 10.5 : 18),
      ),
    [focusPosition, zoomedIn],
  );
  const lookAtRef = useMemo(() => new THREE.Vector3(...(focusPosition ?? [0, 0.4, 0])), [focusPosition]);

  useFrame((_, delta) => {
    const smoothing = 1 - Math.exp(-delta * 3.2);
    camera.position.lerp(desiredPosition, smoothing);
    lookAtRef.lerp(desiredTarget, smoothing);
    camera.lookAt(lookAtRef);
  });

  return null;
}

function OfficeFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]} receiveShadow>
        <planeGeometry args={[WORLD_WIDTH + 16, WORLD_DEPTH + 16]} />
        <meshStandardMaterial color="#90a88b" roughness={1} />
      </mesh>

      {OFFICE_ZONES.map((zone) => (
        <mesh
          key={`${zone.id}-tint`}
          position={toRectCenter(zone, 0.01)}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[zone.w * TILE_WORLD_SIZE * 0.92, zone.h * TILE_WORLD_SIZE * 0.92]} />
          <meshStandardMaterial color={zoneTintPalette[zone.variant]} transparent opacity={0.06} />
        </mesh>
      ))}

      {OFFICE_FLOOR_MAP.flatMap((row, y) =>
        row.map((variant, x) => (
          <mesh key={`${x}-${y}`} position={toWorldPosition(x, y, -FLOOR_THICKNESS / 2)} receiveShadow>
            <boxGeometry args={[TILE_WORLD_SIZE * 0.96, FLOOR_THICKNESS, TILE_WORLD_SIZE * 0.96]} />
            <meshStandardMaterial color={floorPalette[variant]} roughness={0.92} />
          </mesh>
        )),
      )}

      {OFFICE_ZONES.map((zone) => (
        <Html key={zone.id} position={toRectCenter(zone, 0.28)} center distanceFactor={28}>
          <div style={zoneLabelStyle}>{zone.label}</div>
        </Html>
      ))}
    </>
  );
}

function DeskFurniture({ object }: { object: OfficeObject }) {
  const accent = roleAccentColors[object.role ?? ""] ?? "#7f95aa";
  const width = object.w * TILE_WORLD_SIZE * 0.88;
  const depth = object.h * TILE_WORLD_SIZE * 0.76;
  const legOffsetX = Math.max(width / 2 - 0.16, 0.18);
  const legOffsetZ = Math.max(depth / 2 - 0.16, 0.18);

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.18, depth]} />
        <meshStandardMaterial color="#8c6f58" roughness={0.78} />
      </mesh>
      {[
        [-legOffsetX, 0.45, -legOffsetZ],
        [legOffsetX, 0.45, -legOffsetZ],
        [-legOffsetX, 0.45, legOffsetZ],
        [legOffsetX, 0.45, legOffsetZ],
      ].map((position) => (
        <mesh key={position.join("-")} position={position as [number, number, number]} castShadow>
          <boxGeometry args={[0.12, 0.82, 0.12]} />
          <meshStandardMaterial color="#6d5747" roughness={0.86} />
        </mesh>
      ))}
      <mesh position={[0, 1.02, -depth * 0.08]} castShadow>
        <boxGeometry args={[width * 0.42, 0.05, depth * 0.28]} />
        <meshStandardMaterial color="#2a3540" roughness={0.52} />
      </mesh>
      <mesh position={[0, 1.2, -depth * 0.18]} rotation={[-0.42, 0, 0]} castShadow>
        <boxGeometry args={[width * 0.46, 0.3, 0.04]} />
        <meshStandardMaterial color="#18222d" roughness={0.46} />
      </mesh>
      <mesh position={[0, 1.01, depth * 0.24]}>
        <boxGeometry args={[width * 0.54, 0.03, 0.22]} />
        <meshStandardMaterial color="#d3dadf" roughness={0.64} />
      </mesh>
      <mesh position={[width * 0.28, 1.03, depth * 0.18]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.14, 12]} />
        <meshStandardMaterial color={accent} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.99, depth / 2 - 0.08]} castShadow>
        <boxGeometry args={[width * 0.96, 0.04, 0.08]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} roughness={0.42} />
      </mesh>
    </group>
  );
}

function ChairFurniture({ object }: { object: OfficeObject }) {
  const accent = roleAccentColors[object.role ?? ""] ?? "#4d5e6c";
  const size = TILE_WORLD_SIZE * 0.42;

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, 0.1, size]} />
        <meshStandardMaterial color="#4b5662" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.8, -size * 0.32]} castShadow>
        <boxGeometry args={[size, 0.56, 0.08]} />
        <meshStandardMaterial color="#56616e" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.36, 12]} />
        <meshStandardMaterial color="#2e353b" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.24, 0.04, 10, 24]} />
        <meshStandardMaterial color={accent} roughness={0.82} />
      </mesh>
    </group>
  );
}

function SofaFurniture({ object }: { object: OfficeObject }) {
  const width = object.w * TILE_WORLD_SIZE * 0.92;
  const depth = object.h * TILE_WORLD_SIZE * 0.76;

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.38, depth]} />
        <meshStandardMaterial color="#7ca086" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.7, -depth / 2 + 0.08]} castShadow>
        <boxGeometry args={[width, 0.46, 0.16]} />
        <meshStandardMaterial color="#6c8f75" roughness={0.76} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[width * 0.92, 0.08, depth * 0.76]} />
        <meshStandardMaterial color="#9fc1a8" roughness={0.66} />
      </mesh>
    </group>
  );
}

function PlantFurniture({ object }: { object: OfficeObject }) {
  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.32, 14]} />
        <meshStandardMaterial color="#8c6648" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <sphereGeometry args={[0.34, 18, 18]} />
        <meshStandardMaterial color="#5e9c69" roughness={0.78} />
      </mesh>
      <mesh position={[0.18, 0.78, 0.08]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#79b97d" roughness={0.74} />
      </mesh>
      <mesh position={[-0.16, 0.72, -0.12]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#6aad70" roughness={0.74} />
      </mesh>
    </group>
  );
}

function CoffeeBarFurniture({ object }: { object: OfficeObject }) {
  const width = object.w * TILE_WORLD_SIZE * 0.92;
  const depth = object.h * TILE_WORLD_SIZE * 0.86;

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 1.48, depth]} />
        <meshStandardMaterial color="#8b7865" roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.48, 0]} castShadow>
        <boxGeometry args={[width * 0.96, 0.12, depth * 0.94]} />
        <meshStandardMaterial color="#c7c1bb" roughness={0.6} />
      </mesh>
      <mesh position={[-width * 0.24, 1.68, 0]} castShadow>
        <boxGeometry args={[width * 0.24, 0.34, depth * 0.48]} />
        <meshStandardMaterial color="#2d3741" roughness={0.38} />
      </mesh>
      <mesh position={[width * 0.18, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.34, 16]} />
        <meshStandardMaterial color="#d8d1c8" roughness={0.46} />
      </mesh>
    </group>
  );
}

function MeetingTableFurniture({ object }: { object: OfficeObject }) {
  const width = object.w * TILE_WORLD_SIZE * 0.84;
  const depth = object.h * TILE_WORLD_SIZE * 0.84;

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.14, depth]} />
        <meshStandardMaterial color="#8b705a" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.28, 0.9, 0.28]} />
        <meshStandardMaterial color="#655241" roughness={0.82} />
      </mesh>
      {[
        [-width / 2 + 0.52, 0.4, depth / 2 + 0.32],
        [width / 2 - 0.52, 0.4, depth / 2 + 0.32],
        [-width / 2 + 0.52, 0.4, -depth / 2 - 0.32],
        [width / 2 - 0.52, 0.4, -depth / 2 - 0.32],
      ].map((position) => (
        <mesh key={position.join("-")} position={position as [number, number, number]} castShadow>
          <boxGeometry args={[0.58, 0.12, 0.58]} />
          <meshStandardMaterial color="#4f5d68" roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function WallFurniture({ object }: { object: OfficeObject }) {
  const width = object.w * TILE_WORLD_SIZE;
  const depth = object.h * TILE_WORLD_SIZE;

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 2.9, depth]} />
        <meshStandardMaterial color="#ece6dc" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.08, 0.12, depth + 0.08]} />
        <meshStandardMaterial color="#d4cabb" roughness={0.84} />
      </mesh>
    </group>
  );
}

function DoorFurniture({ object }: { object: OfficeObject }) {
  const width = Math.max(object.w * TILE_WORLD_SIZE * 0.74, 0.82);
  const depth = Math.max(object.h * TILE_WORLD_SIZE * 0.18, 0.18);

  return (
    <group position={toRectCenter(object, 0)}>
      <mesh position={[0, 1.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 2.28, depth]} />
        <meshStandardMaterial color="#a9d5e3" transparent opacity={0.5} roughness={0.18} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.14, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 2.4, depth + 0.06]} />
        <meshStandardMaterial color="#a89477" wireframe />
      </mesh>
    </group>
  );
}

function OfficeObjectMesh({ object }: { object: OfficeObject }) {
  switch (object.kind) {
    case "wall":
      return <WallFurniture object={object} />;
    case "door":
      return <DoorFurniture object={object} />;
    case "desk":
      return <DeskFurniture object={object} />;
    case "chair":
      return <ChairFurniture object={object} />;
    case "plant":
      return <PlantFurniture object={object} />;
    case "sofa":
      return <SofaFurniture object={object} />;
    case "coffee-bar":
      return <CoffeeBarFurniture object={object} />;
    case "meeting-table":
      return <MeetingTableFurniture object={object} />;
    default:
      return null;
  }
}

function SeatMarkers({
  agents,
  selectedAgentId,
}: {
  agents: ReturnType<typeof useAgentStore.getState>["agents"];
  selectedAgentId: string | null;
}) {
  return (
    <>
      {OFFICE_SEATS.map((seat) => {
        const occupiedAgent = agents.find((agent) => agent.position.x === seat.x && agent.position.y === seat.y);
        const accent = roleAccentColors[seat.role ?? ""] ?? "#94a3b8";
        const isSelected = occupiedAgent?.id === selectedAgentId;

        return (
          <mesh
            key={seat.id}
            position={toWorldPosition(seat.x, seat.y, 0.03)}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[occupiedAgent ? 0.44 : 0.34, occupiedAgent ? 0.66 : 0.5, 22]} />
            <meshStandardMaterial
              color={accent}
              emissive={accent}
              emissiveIntensity={isSelected ? 0.68 : 0.28}
              transparent
              opacity={occupiedAgent ? 0.82 : 0.38}
            />
          </mesh>
        );
      })}
    </>
  );
}

function SceneDecor() {
  return (
    <>
      <color attach="background" args={["#d7e5e1"]} />
      <fog attach="fog" args={["#d7e5e1", 34, 78]} />
      <hemisphereLight intensity={0.9} color="#fff9ee" groundColor="#708570" />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 26, 10]}
        intensity={1.2}
        color="#fff3d9"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-16, 10, -12]} intensity={0.28} color="#adc8dd" />
      <pointLight position={toWorldPosition(9.5, 1.6, 6.4)} intensity={12} distance={18} color="#ffd59f" />
      <pointLight position={toWorldPosition(18, 2.5, 6.8)} intensity={10} distance={20} color="#cce6ff" />
      <pointLight position={toWorldPosition(4, 2.5, 6.2)} intensity={8} distance={16} color="#d6ffd2" />
    </>
  );
}

export function OfficeDashboard3D({
  embedded = false,
  selectedAgentId,
  onSelectAgent,
}: OfficeDashboard3DProps) {
  const agents = useAgentStore((state) => state.agents);
  const moveAgents = useAgentStore((state) => state.moveAgents);
  const updateAgent = useAgentStore((state) => state.updateAgent);
  const updateAgentStatus = useAgentStore((state) => state.updateAgentStatus);
  const messagesByAgent = useChatStore((state) => state.messagesByAgent);
  const addMessage = useChatStore((state) => state.addMessage);
  const [internalSelectedAgentId, setInternalSelectedAgentId] = useState<string | null>(null);
  const [conversationAgentId, setConversationAgentId] = useState<string | null>(null);
  const [conversationInput, setConversationInput] = useState("");
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  const controlled = typeof selectedAgentId !== "undefined";
  const activeSelectedAgentId = controlled ? selectedAgentId : internalSelectedAgentId;
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === activeSelectedAgentId) ?? null,
    [activeSelectedAgentId, agents],
  );
  const currentConversationAgent = useMemo(
    () => agents.find((agent) => agent.id === conversationAgentId) ?? null,
    [agents, conversationAgentId],
  );
  const panelAgent = currentConversationAgent ?? selectedAgent;
  const panelOpen = Boolean(panelAgent);
  const panelPreview = Boolean(panelAgent && !currentConversationAgent);
  const conversationMessages = panelAgent ? messagesByAgent[panelAgent.id] ?? [] : [];
  const focusPosition = selectedAgent
    ? toWorldPosition(selectedAgent.position.x, selectedAgent.position.y, 0.72)
    : null;

  const statusSummary = useMemo(
    () => ({
      total: agents.length,
      active: agents.filter((agent) => ["thinking", "working", "chatting"].includes(agent.status)).length,
      completed: agents.filter((agent) => agent.status === "completed").length,
    }),
    [agents],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      moveAgents();
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [moveAgents]);

  useEffect(() => {
    if (!activeSelectedAgentId) {
      setConversationAgentId(null);
      setConversationInput("");
      setConversationError(null);
    }
  }, [activeSelectedAgentId]);

  const selectAgent = (id: string | null) => {
    if (id !== activeSelectedAgentId) {
      setConversationAgentId(null);
      setConversationInput("");
      setConversationError(null);
    }
    if (!controlled) {
      setInternalSelectedAgentId(id);
    }
    onSelectAgent?.(id);
  };

  const handleStartConversation = () => {
    if (!selectedAgent) {
      return;
    }

    setConversationAgentId(selectedAgent.id);
    setConversationError(null);
  };

  const handleCloseConversation = () => {
    setConversationAgentId(null);
    setConversationInput("");
    setConversationError(null);
    selectAgent(null);
  };

  const handleSendConversation = async () => {
    if (!window.kafi || !currentConversationAgent || !conversationInput.trim() || conversationLoading) {
      return;
    }

    const userMessage = conversationInput.trim();
    const nearbyAgents = agents.filter(
      (agent) => agent.id !== currentConversationAgent.id && distanceBetween(agent.position, currentConversationAgent.position) <= 2,
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
        const walkTarget = getNearbyWalkTarget(
          currentConversationAgent.position,
          agents.filter((agent) => agent.id !== currentConversationAgent.id).map((agent) => agent.position),
        );

        if (walkTarget) {
          updateAgent(currentConversationAgent.id, {
            targetPosition: walkTarget,
            behavior: "wandering",
          });
        }
      }

      if (previousStatus === "idle") {
        window.setTimeout(() => {
          updateAgentStatus(currentConversationAgent.id, "idle");
        }, parsed.action === "wave" ? 1200 : 600);
      }
    } catch {
      setConversationError("3D 오피스 대화 중 오류가 발생했습니다.");
      if (previousStatus === "idle") {
        updateAgentStatus(currentConversationAgent.id, "idle");
      }
    } finally {
      setConversationLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: embedded ? 680 : 620,
        overflow: "hidden",
        borderRadius: "30px",
        border: "1px solid rgba(95, 113, 133, 0.18)",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.8), transparent 34%), linear-gradient(180deg, #edf4f1 0%, #d8e5df 100%)",
        boxShadow: "0 26px 64px rgba(36, 61, 89, 0.16)",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 28, 18], fov: 38, near: 0.1, far: 160 }}
        onPointerMissed={() => selectAgent(null)}
      >
        <SceneDecor />
        <CameraRig focusPosition={focusPosition} zoomedIn={Boolean(selectedAgent)} />
        <OfficeFloor />
        <SeatMarkers agents={agents} selectedAgentId={activeSelectedAgentId ?? null} />
        {OFFICE_OBJECTS.map((object) => (
          <OfficeObjectMesh key={object.id} object={object} />
        ))}
        {agents.map((agent) => (
          <AnimalEmployee3D
            key={agent.id}
            species={agent.species}
            name={agent.name}
            role={agent.role}
            status={agent.status}
            direction={agent.direction}
            position={toWorldPosition(agent.position.x, agent.position.y, 0.02)}
            selected={agent.id === activeSelectedAgentId}
            onSelect={() => selectAgent(agent.id)}
          />
        ))}
      </Canvas>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            ...overlayPanelStyle,
            position: "absolute",
            top: 18,
            left: 18,
            maxWidth: 320,
            padding: "16px 18px",
          }}
        >
          <div style={{ ...infoLabelStyle, marginBottom: 6 }}>3D Command Deck</div>
          <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: 8 }}>같은 오피스를 입체 씬으로 확인</div>
          <div style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(255,255,255,0.78)" }}>
            2D Gather 오피스와 같은 좌석, 같은 에이전트 상태, 같은 이동 데이터를 그대로 3D에 올렸습니다.
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 8, pointerEvents: "auto" }}>
            <button type="button" style={overviewButtonStyle} onClick={() => selectAgent(null)}>
              전체 보기
            </button>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            display: "grid",
            gap: 10,
          }}
        >
          {[
            { label: "총 인원", value: statusSummary.total, tone: "#d9e6ff" },
            { label: "작업/대화", value: statusSummary.active, tone: "#ffd39b" },
            { label: "완료", value: statusSummary.completed, tone: "#b8f2c2" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                ...overlayPanelStyle,
                minWidth: 116,
                padding: "12px 14px",
                textAlign: "right",
              }}
            >
              <div style={{ ...infoLabelStyle, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: item.tone }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            ...overlayPanelStyle,
            position: "absolute",
            bottom: 18,
            left: 18,
            maxWidth: 280,
            padding: "14px 16px",
          }}
        >
          <div style={{ ...infoLabelStyle, marginBottom: 6 }}>How To Read</div>
          <div style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(255,255,255,0.8)" }}>
            사원을 클릭하면 카메라가 해당 자리로 부드럽게 이동하고, 아래 직통 채널 패널에서 바로 대화를 시작할 수 있습니다.
          </div>
        </div>

        {!panelOpen && (
          <div
            style={{
              ...overlayPanelStyle,
              position: "absolute",
              right: 18,
              bottom: 18,
              width: 320,
              padding: "16px 18px",
            }}
          >
            <div style={{ ...infoLabelStyle, marginBottom: 6 }}>Overview</div>
            <div style={{ fontSize: "19px", fontWeight: 800, marginBottom: 8 }}>아직 선택된 사원이 없습니다</div>
            <div style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
              카피바라 PM부터 팀원 좌석까지 현재 워크플로우 상태가 그대로 반영됩니다. 사원을 클릭해 직통 채널을 열어보세요.
            </div>
          </div>
        )}
      </div>

      <OfficeConversationPanel
        open={panelOpen}
        preview={panelPreview}
        agent={panelAgent}
        messages={conversationMessages}
        input={conversationInput}
        loading={conversationLoading}
        error={conversationError}
        locationLabel={panelAgent ? getLocationLabel(panelAgent.position) : null}
        proximityLabel={panelAgent ? (currentConversationAgent ? "직통 대화 채널" : "선택된 사원 프리뷰") : null}
        proximityVolume={panelAgent ? 100 : null}
        emptyDescription="선택한 사원에게 지시나 질문을 보내세요."
        previewEmptyDescription="사원을 선택하면 바로 직통 채널을 열고 대화를 시작할 수 있습니다."
        previewTitle={panelAgent ? `${panelAgent.name} 직통 채널 준비됨` : "사원 선택 대기"}
        previewHint="아래 버튼으로 바로 대화 입력 모드로 전환할 수 있습니다."
        startButtonLabel="직통 대화 열기"
        inputPlaceholder="선택한 사원에게 지시나 질문을 보내세요."
        onChangeInput={setConversationInput}
        onStartConversation={handleStartConversation}
        onClose={handleCloseConversation}
        onSend={() => void handleSendConversation()}
      />
    </div>
  );
}
