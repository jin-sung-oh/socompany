import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { useBlinkAnimation, updateBlinkAnimation, type AnimalModelProps } from "./animalUtils";

export function OwlModel({ state, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AnimalModelProps) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const { blink, blinkTimer, blinkTimeoutRef, setBlink } = useBlinkAnimation();

  useFrame((_, delta) => {
    if (!groupRef.current || !headRef.current) return;

    updateBlinkAnimation(delta, blinkTimer, setBlink, blinkTimeoutRef);
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = blink ? 0.1 : 1;
      rightEyeRef.current.scale.y = blink ? 0.1 : 1;
    }

    const time = Date.now();
    switch (state) {
      case "idle":
        // 눈만 깜빡이며 가만히 있음 (신중한 느낌)
        groupRef.current.position.y = Math.sin(time * 0.001) * 0.01;
        break;
      case "thinking":
        // 머리를 270도 회전 (올빼미 특유의 동작!)
        const rotationCycle = (time * 0.002) % (Math.PI * 2);
        if (rotationCycle > Math.PI) {
          headRef.current.rotation.y = Math.PI * 1.5 * Math.sin(rotationCycle);
        } else {
          headRef.current.rotation.y = 0;
        }
        break;
      case "working":
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.008)) * 0.08;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 2;
        break;
      case "error":
        groupRef.current.rotation.z = Math.sin(time * 0.015) * 0.08;
        break;
    }
  });

  const bodyColor = "#8B7355"; // 올빼미 갈색
  const lightColor = "#F5DEB3"; // 밝은 베이지

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* 몸통 - 계란형 */}
      <mesh castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 배 부분 - 밝은 색 */}
      <mesh castShadow position={[0, -0.1, 0.45]}>
        <sphereGeometry args={[0.35, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={lightColor} />
      </mesh>

      {/* 머리 - 몸통과 일체형이지만 상단 그룹 */}
      <group ref={headRef} position={[0, 0.45, 0]}>
        {/* 큰 눈 2개 - 올빼미의 상징! */}
        <group>
          {/* 왼쪽 눈 외곽 */}
          <mesh castShadow position={[-0.22, 0, 0.35]}>
            <circleGeometry args={[0.15, 32]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* 왼쪽 눈동자 */}
          <mesh ref={leftEyeRef} castShadow position={[-0.22, 0, 0.36]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#000000" />
          </mesh>

          {/* 오른쪽 눈 외곽 */}
          <mesh castShadow position={[0.22, 0, 0.35]}>
            <circleGeometry args={[0.15, 32]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* 오른쪽 눈동자 */}
          <mesh ref={rightEyeRef} castShadow position={[0.22, 0, 0.36]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        </group>

        {/* 부리 */}
        <mesh castShadow position={[0, -0.15, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.15, 8]} />
          <meshStandardMaterial color="#FFA500" />
        </mesh>

        {/* 귀 깃털 - 뾰족한 깃털 2개 */}
        <mesh castShadow position={[-0.3, 0.25, -0.1]} rotation={[0, 0, -Math.PI / 6]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
        <mesh castShadow position={[0.3, 0.25, -0.1]} rotation={[0, 0, Math.PI / 6]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </group>

      {/* 날개 2개 */}
      <mesh castShadow position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.15, 0.8, 0.05]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      <mesh castShadow position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.15, 0.8, 0.05]} />
        <meshStandardMaterial color="#654321" />
      </mesh>

      {/* 발 2개 (짧음) */}
      <mesh castShadow position={[-0.15, -0.5, 0.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.15]} />
        <meshStandardMaterial color="#FFA500" />
      </mesh>
      <mesh castShadow position={[0.15, -0.5, 0.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.15]} />
        <meshStandardMaterial color="#FFA500" />
      </mesh>

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.6, 0.8, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
          <mesh position={[0.08, 0.08, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
          <mesh position={[0.18, 0.18, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#9ad1f5" emissive="#9ad1f5" />
          </mesh>
        </group>
      )}

      {state === "completed" && (
        <>
          <pointLight position={[0, 1.2, 0]} color="#FFD700" intensity={2} />
          <mesh position={[0, 1.5, 0]} rotation={[0, Date.now() * 0.001, 0]}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1.5} />
          </mesh>
        </>
      )}

      {state === "working" && <pointLight position={[0, 0.8, 0]} color="#FFA500" intensity={1.5} />}

      {state === "error" && <pointLight position={[0, 0.8, 0]} color="#FF0000" intensity={1} />}
    </group>
  );
}
