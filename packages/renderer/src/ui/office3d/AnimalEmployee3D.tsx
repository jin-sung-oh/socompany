import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AgentStatus, AnimalSpecies } from "@kafi/shared";

type Direction = "left" | "right" | "up" | "down";

type AnimalEmployee3DProps = {
  species: AnimalSpecies;
  name: string;
  role: string;
  status: AgentStatus;
  position: [number, number, number];
  direction: Direction;
  selected: boolean;
  onSelect: () => void;
};

type SpeciesPalette = {
  fur: string;
  accent: string;
  belly: string;
  earInner: string;
  scale: number;
};

const speciesPalettes: Record<AnimalSpecies, SpeciesPalette> = {
  capybara: {
    fur: "#9f7a56",
    accent: "#7a573b",
    belly: "#d2b896",
    earInner: "#c49b72",
    scale: 1.02,
  },
  pig: {
    fur: "#e8a5b8",
    accent: "#cc738f",
    belly: "#f6ccd7",
    earInner: "#f7d6df",
    scale: 0.98,
  },
  fox: {
    fur: "#d96e33",
    accent: "#f8efe4",
    belly: "#f6dcc3",
    earInner: "#ffd7b8",
    scale: 0.96,
  },
  tiger: {
    fur: "#d08a31",
    accent: "#2d241f",
    belly: "#f1d7a8",
    earInner: "#f7e5c8",
    scale: 1.04,
  },
  dog: {
    fur: "#b78856",
    accent: "#7a5030",
    belly: "#e2c59b",
    earInner: "#d4b287",
    scale: 1,
  },
  cat: {
    fur: "#8d92a3",
    accent: "#4a4f62",
    belly: "#d7dbe6",
    earInner: "#f2ccd6",
    scale: 0.94,
  },
};

const statusColors: Record<AgentStatus, string> = {
  idle: "#7f95aa",
  thinking: "#56a8ff",
  working: "#f59f3a",
  completed: "#41c47a",
  error: "#ef5350",
  chatting: "#8c7cff",
};

const statusLabels: Record<AgentStatus, string> = {
  idle: "대기",
  thinking: "생각 중",
  working: "작업 중",
  completed: "완료",
  error: "오류",
  chatting: "대화 중",
};

const directionToRotation: Record<Direction, number> = {
  down: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
  up: Math.PI,
};

const labelStyle = {
  padding: "10px 12px",
  minWidth: "140px",
  borderRadius: "16px",
  color: "#f9fbff",
  background: "rgba(15, 22, 29, 0.88)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.24)",
  backdropFilter: "blur(10px)",
  textAlign: "center" as const,
  pointerEvents: "none" as const,
};

const ringMaterialProps = {
  transparent: true,
  opacity: 0.9,
};

const renderEars = (species: AnimalSpecies, palette: SpeciesPalette) => {
  switch (species) {
    case "capybara":
      return (
        <>
          <mesh position={[-0.2, 0.24, -0.04]} castShadow>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color={palette.fur} roughness={0.82} />
          </mesh>
          <mesh position={[0.2, 0.24, -0.04]} castShadow>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color={palette.fur} roughness={0.82} />
          </mesh>
        </>
      );
    case "pig":
      return (
        <>
          <mesh position={[-0.24, 0.28, -0.02]} rotation={[0, 0, -0.45]} castShadow>
            <coneGeometry args={[0.11, 0.28, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.78} />
          </mesh>
          <mesh position={[0.24, 0.28, -0.02]} rotation={[0, 0, 0.45]} castShadow>
            <coneGeometry args={[0.11, 0.28, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.78} />
          </mesh>
        </>
      );
    case "dog":
      return (
        <>
          <mesh position={[-0.32, 0.12, -0.02]} rotation={[0.08, 0.1, -0.55]} castShadow>
            <capsuleGeometry args={[0.08, 0.3, 6, 10]} />
            <meshStandardMaterial color={palette.accent} roughness={0.86} />
          </mesh>
          <mesh position={[0.32, 0.12, -0.02]} rotation={[0.08, -0.1, 0.55]} castShadow>
            <capsuleGeometry args={[0.08, 0.3, 6, 10]} />
            <meshStandardMaterial color={palette.accent} roughness={0.86} />
          </mesh>
        </>
      );
    default:
      return (
        <>
          <mesh position={[-0.25, 0.32, -0.02]} rotation={[0, 0, -0.3]} castShadow>
            <coneGeometry args={[0.11, 0.34, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.8} />
          </mesh>
          <mesh position={[0.25, 0.32, -0.02]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.11, 0.34, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.8} />
          </mesh>
          <mesh position={[-0.25, 0.24, 0.02]} rotation={[0, 0, -0.3]} castShadow>
            <coneGeometry args={[0.055, 0.16, 10]} />
            <meshStandardMaterial color={palette.earInner} roughness={0.72} />
          </mesh>
          <mesh position={[0.25, 0.24, 0.02]} rotation={[0, 0, 0.3]} castShadow>
            <coneGeometry args={[0.055, 0.16, 10]} />
            <meshStandardMaterial color={palette.earInner} roughness={0.72} />
          </mesh>
        </>
      );
  }
};

const renderTail = (
  species: AnimalSpecies,
  palette: SpeciesPalette,
  tailRef: React.RefObject<THREE.Group | null>,
) => {
  switch (species) {
    case "capybara":
      return (
        <group ref={tailRef} position={[0, 0.5, -0.56]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.07, 0.18, 6, 10]} />
            <meshStandardMaterial color={palette.accent} roughness={0.86} />
          </mesh>
        </group>
      );
    case "pig":
      return (
        <group ref={tailRef} position={[0, 0.56, -0.55]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.12, 0.03, 10, 20]} />
            <meshStandardMaterial color={palette.accent} roughness={0.7} />
          </mesh>
        </group>
      );
    case "fox":
      return (
        <group ref={tailRef} position={[0, 0.62, -0.7]} rotation={[-0.2, 0, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.17, 0.72, 14]} />
            <meshStandardMaterial color={palette.fur} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial color={palette.accent} roughness={0.74} />
          </mesh>
        </group>
      );
    case "tiger":
      return (
        <group ref={tailRef} position={[0, 0.56, -0.7]} rotation={[-0.1, 0, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.08, 0.58, 8, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.8} />
          </mesh>
          {[-0.16, 0, 0.16].map((offset) => (
            <mesh key={offset} position={[0, offset, 0]} castShadow>
              <torusGeometry args={[0.11, 0.022, 8, 18]} />
              <meshStandardMaterial color={palette.accent} roughness={0.84} />
            </mesh>
          ))}
        </group>
      );
    case "dog":
      return (
        <group ref={tailRef} position={[0, 0.66, -0.68]} rotation={[0.32, 0, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.07, 0.5, 8, 12]} />
            <meshStandardMaterial color={palette.fur} roughness={0.84} />
          </mesh>
        </group>
      );
    case "cat":
    default:
      return (
        <group ref={tailRef} position={[0, 0.78, -0.66]} rotation={[0.56, 0, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.06, 0.6, 8, 12]} />
            <meshStandardMaterial color={palette.accent} roughness={0.82} />
          </mesh>
        </group>
      );
  }
};

const renderHeadDetails = (species: AnimalSpecies, palette: SpeciesPalette) => {
  const whiskerMaterial = <meshStandardMaterial color={palette.accent} roughness={0.95} />;

  return (
    <>
      {species === "pig" ? (
        <mesh position={[0, -0.05, 0.4]} castShadow>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color={palette.accent} roughness={0.7} />
        </mesh>
      ) : (
        <mesh position={[0, -0.08, 0.42]} castShadow>
          <capsuleGeometry args={[0.09, 0.14, 8, 10]} />
          <meshStandardMaterial color={palette.belly} roughness={0.76} />
        </mesh>
      )}

      <mesh position={[-0.15, 0.08, 0.33]} castShadow>
        <sphereGeometry args={[0.04, 14, 14]} />
        <meshBasicMaterial color="#15181d" />
      </mesh>
      <mesh position={[0.15, 0.08, 0.33]} castShadow>
        <sphereGeometry args={[0.04, 14, 14]} />
        <meshBasicMaterial color="#15181d" />
      </mesh>
      <mesh position={[0, -0.03, 0.55]} castShadow>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#15181d" />
      </mesh>

      {species === "tiger" && (
        <>
          {[-0.16, 0, 0.16].map((offset) => (
            <mesh key={offset} position={[offset, 0.26, 0.12]} rotation={[0.12, 0, 0]} castShadow>
              <boxGeometry args={[0.08, 0.2, 0.03]} />
              <meshStandardMaterial color={palette.accent} roughness={0.92} />
            </mesh>
          ))}
        </>
      )}

      {(species === "cat" || species === "fox") && (
        <>
          <mesh position={[-0.28, -0.02, 0.36]} rotation={[0, 0, -0.16]} castShadow>
            <boxGeometry args={[0.26, 0.015, 0.015]} />
            {whiskerMaterial}
          </mesh>
          <mesh position={[-0.28, -0.09, 0.36]} rotation={[0, 0, 0.16]} castShadow>
            <boxGeometry args={[0.26, 0.015, 0.015]} />
            {whiskerMaterial}
          </mesh>
          <mesh position={[0.28, -0.02, 0.36]} rotation={[0, 0, 0.16]} castShadow>
            <boxGeometry args={[0.26, 0.015, 0.015]} />
            {whiskerMaterial}
          </mesh>
          <mesh position={[0.28, -0.09, 0.36]} rotation={[0, 0, -0.16]} castShadow>
            <boxGeometry args={[0.26, 0.015, 0.015]} />
            {whiskerMaterial}
          </mesh>
        </>
      )}
    </>
  );
};

const renderBodyMarkings = (species: AnimalSpecies, palette: SpeciesPalette) => {
  if (species === "tiger") {
    return (
      <>
        {[-0.24, 0, 0.24].map((offset) => (
          <mesh key={offset} position={[offset, 0.78, 0.14]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.58, 0.03]} />
            <meshStandardMaterial color={palette.accent} roughness={0.9} />
          </mesh>
        ))}
      </>
    );
  }

  if (species === "cat") {
    return (
      <>
        <mesh position={[-0.18, 1.02, 0.28]} rotation={[0.16, 0, 0.14]} castShadow>
          <boxGeometry args={[0.1, 0.34, 0.025]} />
          <meshStandardMaterial color={palette.accent} roughness={0.94} />
        </mesh>
        <mesh position={[0.18, 0.96, 0.22]} rotation={[0.12, 0, -0.14]} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.025]} />
          <meshStandardMaterial color={palette.accent} roughness={0.94} />
        </mesh>
      </>
    );
  }

  return null;
};

const renderStatusEffect = (status: AgentStatus, color: string) => {
  if (status === "thinking") {
    return (
      <group position={[0.45, 2.1, 0]}>
        {[0, 0.12, 0.24].map((offset, index) => (
          <mesh key={offset} position={[offset, offset, 0]}>
            <sphereGeometry args={[0.05 + index * 0.015, 14, 14]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
          </mesh>
        ))}
      </group>
    );
  }

  if (status === "completed") {
    return (
      <mesh position={[0, 2.15, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
    );
  }

  if (status === "working") {
    return (
      <mesh position={[0.44, 0.95, 0.15]} rotation={[0, 0.28, 0]}>
        <boxGeometry args={[0.18, 0.12, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} roughness={0.45} />
      </mesh>
    );
  }

  if (status === "chatting") {
    return (
      <group position={[0.48, 2.02, 0]}>
        <mesh>
          <sphereGeometry args={[0.14, 18, 18]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} />
        </mesh>
        <mesh position={[-0.12, -0.14, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
      </group>
    );
  }

  if (status === "error") {
    return (
      <mesh position={[0, 2.06, 0]}>
        <coneGeometry args={[0.18, 0.35, 3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    );
  }

  return null;
};

export function AnimalEmployee3D({
  species,
  name,
  role,
  status,
  position,
  direction,
  selected,
  onSelect,
}: AnimalEmployee3DProps) {
  const anchorRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const palette = speciesPalettes[species];
  const accentColor = statusColors[status];
  const motionSeed = useMemo(() => Math.random() * Math.PI * 2, []);
  const targetPosition = useMemo(() => new THREE.Vector3(...position), [position]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!anchorRef.current || !bodyRef.current || !headRef.current) {
      return;
    }

    const smoothing = 1 - Math.exp(-delta * 10);
    anchorRef.current.position.lerp(targetPosition, smoothing);
    anchorRef.current.rotation.y = THREE.MathUtils.lerp(
      anchorRef.current.rotation.y,
      directionToRotation[direction],
      1 - Math.exp(-delta * 12),
    );

    const time = clock.elapsedTime + motionSeed;
    let bob = Math.sin(time * 2.2) * 0.03;
    let sway = Math.sin(time * 1.4) * 0.03;
    let headPitch = Math.sin(time * 1.3) * 0.04;
    let tailPitch = Math.sin(time * 2.4) * 0.12;

    if (status === "thinking" || status === "chatting") {
      headPitch = Math.sin(time * 3.4) * 0.16;
      tailPitch = Math.sin(time * 4.4) * 0.16;
    }

    if (status === "working") {
      bob = Math.abs(Math.sin(time * 8.5)) * 0.11;
      sway = Math.sin(time * 5.8) * 0.04;
      tailPitch = Math.sin(time * 6.8) * 0.2;
    }

    if (status === "completed") {
      bob = Math.abs(Math.sin(time * 5.2)) * 0.14;
      sway = Math.sin(time * 6) * 0.08;
      tailPitch = Math.sin(time * 5.6) * 0.2;
    }

    if (status === "error") {
      sway = Math.sin(time * 10.5) * 0.12;
      headPitch = Math.sin(time * 6.4) * 0.04;
      tailPitch = Math.sin(time * 8.2) * 0.08;
    }

    bodyRef.current.position.y = bob;
    bodyRef.current.rotation.z = sway;
    headRef.current.rotation.x = headPitch;
    if (tailRef.current) {
      tailRef.current.rotation.x = tailPitch;
    }
    if (ringRef.current) {
      const pulse = selected ? 1.08 + Math.sin(time * 3.8) * 0.06 : hovered ? 1.03 : 1;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group
      ref={anchorRef}
      position={position}
      scale={palette.scale}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
        setHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "auto";
        setHovered(false);
      }}
    >
      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, selected ? 0.07 : 0.05, 14, 32]} />
        <meshStandardMaterial
          color={selected ? "#fff1a6" : accentColor}
          emissive={selected ? "#fff1a6" : accentColor}
          emissiveIntensity={selected ? 0.6 : 0.35}
          {...ringMaterialProps}
        />
      </mesh>

      <group ref={bodyRef}>
        <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.4, 0.78, 10, 16]} />
          <meshStandardMaterial color={palette.fur} roughness={0.84} />
        </mesh>

        <mesh position={[0, 0.7, 0.24]} castShadow>
          <sphereGeometry args={[0.26, 20, 20]} />
          <meshStandardMaterial color={palette.belly} roughness={0.78} />
        </mesh>

        {renderBodyMarkings(species, palette)}

        {[
          [-0.22, 0.22, 0.18],
          [0.22, 0.22, 0.18],
          [-0.22, 0.22, -0.18],
          [0.22, 0.22, -0.18],
        ].map((legPosition) => (
          <mesh key={legPosition.join("-")} position={legPosition as [number, number, number]} castShadow>
            <capsuleGeometry args={[0.08, 0.32, 8, 10]} />
            <meshStandardMaterial color={palette.accent} roughness={0.92} />
          </mesh>
        ))}

        <group ref={headRef} position={[0, 1.42, 0.22]}>
          <mesh castShadow>
            <sphereGeometry args={[0.42, 22, 22]} />
            <meshStandardMaterial color={palette.fur} roughness={0.8} />
          </mesh>
          {renderEars(species, palette)}
          {renderHeadDetails(species, palette)}
        </group>

        {renderTail(species, palette, tailRef)}
        {renderStatusEffect(status, accentColor)}
      </group>

      {(hovered || selected) && (
        <Html position={[0, 2.55, 0]} center distanceFactor={12}>
          <div style={labelStyle}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>{name}</div>
            <div style={{ fontSize: "11px", opacity: 0.78 }}>{role}</div>
            <div style={{ fontSize: "11px", color: accentColor, marginTop: "6px", fontWeight: 600 }}>{statusLabels[status]}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
