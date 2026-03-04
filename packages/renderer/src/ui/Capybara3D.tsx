import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh, Group } from "three";

interface Capybara3DModelProps {
  state: "idle" | "thinking" | "working" | "completed";
}

function Capybara3DModel({ state }: Capybara3DModelProps) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const [blink, setBlink] = useState(false);
  const blinkTimer = useRef(0);
  const blinkTimeoutRef = useRef<number | null>(null);

  // Cleanup blink timeout on unmount
  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current !== null) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !headRef.current || !tailRef.current) return;

    // 눈 깜빡임 로직 with cleanup
    blinkTimer.current += delta;
    if (blinkTimer.current > 3 + Math.random() * 4) {
      setBlink(true);
      if (blinkTimeoutRef.current !== null) {
        clearTimeout(blinkTimeoutRef.current);
      }
      blinkTimeoutRef.current = window.setTimeout(() => {
        setBlink(false);
        blinkTimeoutRef.current = null;
      }, 150);
      blinkTimer.current = 0;
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = blink ? 0.1 : 1;
      rightEyeRef.current.scale.y = blink ? 0.1 : 1;
    }

    // 애니메이션
    const time = Date.now();
    switch (state) {
      case "idle":
        groupRef.current.position.y = Math.sin(time * 0.002) * 0.03;
        headRef.current.rotation.x = Math.sin(time * 0.001) * 0.05;
        break;
      case "thinking":
        headRef.current.rotation.y = Math.sin(time * 0.004) * 0.15;
        break;
      case "working":
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.01)) * 0.1;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 4;
        break;
    }
  });

  const bodyColor = "#8E5A31"; // 카피바라 갈색
  const snoutColor = "#734828"; // 주둥이 색상

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* 몸통 - 길쭉하고 둥근 사각형 느낌 */}
      <mesh castShadow position={[0, 0, -0.1]}>
        <boxGeometry args={[1, 0.8, 1.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>
      {/* 몸통 뒷부분 보정 (더 둥글게) */}
      <mesh castShadow position={[0, -0.05, -0.6]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 목 - 두껍게 */}
      <mesh castShadow position={[0, 0.2, 0.4]}>
        <boxGeometry args={[0.8, 0.6, 0.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 머리 - 카피바라 특유의 상자형 머리 */}
      <group ref={headRef} position={[0, 0.5, 0.7]}>
        {/* 뒤통수 */}
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.7, 0.6]} />
          <meshStandardMaterial color={bodyColor} roughness={0.8} />
        </mesh>
        {/* 주둥이 (길고 상자 모양) */}
        <mesh castShadow position={[0, -0.1, 0.4]}>
          <boxGeometry args={[0.65, 0.5, 0.6]} />
          <meshStandardMaterial color={snoutColor} roughness={0.8} />
        </mesh>

        {/* 눈 (머리 위쪽에 위치) */}
        <mesh ref={leftEyeRef} position={[-0.36, 0.2, 0.1]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.36, 0.2, 0.1]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 귀 (뒤쪽에 작고 둥글게) */}
        <mesh position={[-0.3, 0.35, -0.1]} rotation={[0, 0.2, -0.2]}>
          <sphereGeometry args={[0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={bodyColor} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.3, 0.35, -0.1]} rotation={[0, -0.2, 0.2]}>
          <sphereGeometry args={[0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={bodyColor} side={THREE.DoubleSide} />
        </mesh>

        {/* 콧구멍 */}
        <mesh position={[-0.08, -0.05, 0.71]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.08, -0.05, 0.71]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>

        {/* 입 (V자 모양) */}
        <group position={[0, -0.25, 0.7]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>
      </group>

      {/* 발 (짧고 뭉툭함) */}
      {[[-0.35, -0.5, 0.4], [0.35, -0.5, 0.4], [-0.35, -0.5, -0.5], [0.35, -0.5, -0.5]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.25, 0.3, 0.25]} />
          <meshStandardMaterial color="#634124" />
        </mesh>
      ))}

      {/* 꼬리 (거의 안 보임, 흔적만) */}
      <mesh ref={tailRef} position={[0, -0.1, -0.9]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.4, 0.8, 0.6]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
          <mesh position={[0.1, 0.1, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
          <mesh position={[0.25, 0.25, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
        </group>
      )}

      {state === "completed" && (
        <group>
          <pointLight position={[0.5, 1, 0.5]} color="#FFD700" intensity={2} />
          <mesh position={[0, 1.2, 0]}>
            <octahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" />
          </mesh>
        </group>
      )}
    </group>
  );
}

interface Capybara3DProps {
  state?: "idle" | "thinking" | "working" | "completed";
}

export function Capybara3D({ state = "idle" }: Capybara3DProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* 원래 카메라 설정 사용 */}
      <Canvas shadows camera={{ position: [0, 0.4, 2.5], fov: 45 }}>
        {/* 조명 */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-5, 3, -5]} intensity={0.8} color="#f7b267" />
        <pointLight position={[0, 2, 5]} intensity={0.5} />

        {/* 카피바라 모델 (1.5배 크게) */}
        <Capybara3DModel state={state} />

        {/* 바닥 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f0e7dd" roughness={0.8} />
        </mesh>
      </Canvas>
    </div>
  );
}
