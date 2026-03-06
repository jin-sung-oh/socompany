import { useState, useRef, ReactNode } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Group } from "three";

interface ClickableAgentProps {
  children: ReactNode;
  agentId: string;
  agentName: string;
  agentRole: string;
  agentEmoji: string;
  agentStatus: string;
  onAgentClick?: (agentId: string) => void;
  onHoverChange?: (agentId: string | null) => void;
  position: [number, number, number];
  scale?: number;
}

export function ClickableAgent({
  children,
  agentId,
  agentName,
  agentRole,
  agentEmoji,
  agentStatus,
  onAgentClick,
  onHoverChange,
  position,
  scale = 1,
}: ClickableAgentProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const hoverRingRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Hover scale effect
    const targetScale = hovered ? scale * 1.05 : clicked ? scale * 0.95 : scale;
    groupRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale } as any, delta * 10);

    // Hover ring animation
    if (hoverRingRef.current && hovered) {
      hoverRingRef.current.rotation.z += delta * 2;
      hoverRingRef.current.scale.x = 1 + Math.sin(Date.now() * 0.005) * 0.1;
      hoverRingRef.current.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    }

    // Reset clicked state
    if (clicked) {
      setTimeout(() => setClicked(false), 100);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setClicked(true);

    // Jump animation
    if (groupRef.current) {
      const originalY = groupRef.current.position.y;
      groupRef.current.position.y = originalY + 0.3;
      setTimeout(() => {
        if (groupRef.current) {
          groupRef.current.position.y = originalY;
        }
      }, 200);
    }

    if (onAgentClick) {
      onAgentClick(agentId);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
    if (onHoverChange) {
      onHoverChange(agentId);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "auto";
    if (onHoverChange) {
      onHoverChange(null);
    }
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* The actual animal model */}
      {children}

      {/* Hover ring indicator */}
      {hovered && (
        <mesh
          ref={hoverRingRef}
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.6, 0.03, 16, 32]} />
          <meshStandardMaterial
            color="#4A90E2"
            emissive="#4A90E2"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Selection indicator */}
      {clicked && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={2}
          />
        </mesh>
      )}
    </group>
  );
}
