import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { useBlinkAnimation, updateBlinkAnimation, type AnimalModelProps } from "./animalUtils";

export function BeaverModel({ state, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AnimalModelProps) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const { blink, blinkTimer, blinkTimeoutRef, setBlink } = useBlinkAnimation();

  useFrame((_, delta) => {
    if (!groupRef.current || !headRef.current || !tailRef.current) return;

    // 눈 깜빡임
    updateBlinkAnimation(delta, blinkTimer, setBlink, blinkTimeoutRef);
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = blink ? 0.1 : 1;
      rightEyeRef.current.scale.y = blink ? 0.1 : 1;
    }

    // 상태별 애니메이션
    const time = Date.now();
    switch (state) {
      case "idle":
        groupRef.current.position.y = Math.sin(time * 0.002) * 0.03;
        headRef.current.rotation.x = Math.sin(time * 0.001) * 0.05;
        // 꼬리 살짝 흔들기
        tailRef.current.rotation.x = Math.PI / 4 + Math.sin(time * 0.003) * 0.1;
        break;
      case "thinking":
        // 앞니로 나무 갉는 모션
        headRef.current.rotation.x = Math.sin(time * 0.02) * 0.1;
        headRef.current.rotation.y = Math.sin(time * 0.004) * 0.15;
        tailRef.current.rotation.x = Math.PI / 4 + Math.sin(time * 0.02) * 0.15;
        break;
      case "working":
        // 나무를 쓰러뜨리듯 좌우로 움직임
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.01)) * 0.1;
        groupRef.current.position.x = Math.sin(time * 0.008) * 0.05;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 2;
        break;
      case "error":
        groupRef.current.rotation.z = Math.sin(time * 0.015) * 0.08;
        break;
    }
  });

  const bodyColor = "#8B5A2B"; // 비버 갈색
  const darkColor = "#654321"; // 어두운 갈색

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* 몸통 - 통통한 타원형 */}
      <mesh castShadow position={[0, 0, -0.1]}>
        <boxGeometry args={[0.9, 0.7, 1.2]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 몸통 뒷부분 (둥글게) */}
      <mesh castShadow position={[0, -0.05, -0.7]} scale={[1, 0.9, 0.8]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 목 */}
      <mesh castShadow position={[0, 0.3, 0.3]}>
        <boxGeometry args={[0.7, 0.5, 0.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* 머리 */}
      <group ref={headRef} position={[0, 0.45, 0.6]}>
        {/* 뒤통수 - 각진 형태 */}
        <mesh castShadow>
          <boxGeometry args={[0.65, 0.65, 0.55]} />
          <meshStandardMaterial color={bodyColor} roughness={0.8} />
        </mesh>

        {/* 주둥이 */}
        <mesh castShadow position={[0, -0.1, 0.35]}>
          <boxGeometry args={[0.5, 0.4, 0.4]} />
          <meshStandardMaterial color={darkColor} />
        </mesh>

        {/* 큰 앞니 2개 - 비버의 상징! */}
        <mesh castShadow position={[-0.08, -0.2, 0.55]}>
          <boxGeometry args={[0.06, 0.15, 0.08]} />
          <meshStandardMaterial color="#fff8dc" />
        </mesh>
        <mesh castShadow position={[0.08, -0.2, 0.55]}>
          <boxGeometry args={[0.06, 0.15, 0.08]} />
          <meshStandardMaterial color="#fff8dc" />
        </mesh>

        {/* 눈 */}
        <mesh ref={leftEyeRef} castShadow position={[-0.2, 0.1, 0.3]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh ref={rightEyeRef} castShadow position={[0.2, 0.1, 0.3]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 코 */}
        <mesh castShadow position={[0, -0.05, 0.52]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 귀 - 작고 둥글게 */}
        <mesh castShadow position={[-0.28, 0.32, -0.05]}>
          <sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh castShadow position={[0.28, 0.32, -0.05]}>
          <sphereGeometry args={[0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      </group>

      {/* 넓적한 꼬리 - 비버의 상징! */}
      <mesh ref={tailRef} castShadow position={[0, -0.05, -1.1]} rotation={[Math.PI / 4, 0, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.7]} />
        <meshStandardMaterial color={darkColor} roughness={0.9} />
      </mesh>

      {/* 짧은 다리 4개 */}
      {[
        [-0.3, -0.45, 0.3],
        [0.3, -0.45, 0.3],
        [-0.3, -0.45, -0.4],
        [0.3, -0.45, -0.4]
      ].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.08, 0.08, 0.25]} />
          <meshStandardMaterial color={darkColor} />
        </mesh>
      ))}

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.5, 0.8, 0]}>
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
