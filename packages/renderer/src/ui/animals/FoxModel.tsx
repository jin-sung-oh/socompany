import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { useBlinkAnimation, updateBlinkAnimation, type AnimalModelProps } from "./animalUtils";

export function FoxModel({ state, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AnimalModelProps) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const { blink, blinkTimer, blinkTimeoutRef, setBlink } = useBlinkAnimation();

  useFrame((_, delta) => {
    if (!groupRef.current || !headRef.current || !tailRef.current) return;

    updateBlinkAnimation(delta, blinkTimer, setBlink, blinkTimeoutRef);
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y = blink ? 0.1 : 1;
      rightEyeRef.current.scale.y = blink ? 0.1 : 1;
    }

    const time = Date.now();
    switch (state) {
      case "idle":
        groupRef.current.position.y = Math.sin(time * 0.002) * 0.03;
        headRef.current.rotation.x = Math.sin(time * 0.001) * 0.05;
        tailRef.current.rotation.z = Math.sin(time * 0.003) * 0.1;
        break;
      case "thinking":
        // 귀를 쫑긋 - 고개를 더 많이 돌림
        headRef.current.rotation.y = Math.sin(time * 0.005) * 0.2;
        tailRef.current.rotation.z = Math.sin(time * 0.003) * 0.1;
        break;
      case "working":
        // 빠르게 움직임 (영리한 느낌)
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.015)) * 0.12;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 3;
        break;
      case "error":
        groupRef.current.rotation.z = Math.sin(time * 0.015) * 0.08;
        break;
    }
  });

  const bodyColor = "#FF6B35"; // 여우 오렌지색
  const whiteColor = "#FFFFFF";

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* 몸통 - 날씬한 타원형 */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 16, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* 배 부분 - 흰색 */}
      <mesh castShadow position={[0, -0.1, 0.3]}>
        <sphereGeometry args={[0.25, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={whiteColor} />
      </mesh>

      {/* 머리 */}
      <group ref={headRef} position={[0, 0.5, 0.4]}>
        {/* 두개골 */}
        <mesh castShadow>
          <coneGeometry args={[0.35, 0.5, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* 긴 주둥이 */}
        <mesh castShadow position={[0, -0.1, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.45, 8]} />
          <meshStandardMaterial color={whiteColor} />
        </mesh>

        {/* 뾰족한 귀 - 여우 특징! */}
        <mesh castShadow position={[-0.2, 0.35, -0.05]} rotation={[0, 0, -Math.PI / 8]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh castShadow position={[0.2, 0.35, -0.05]} rotation={[0, 0, Math.PI / 8]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* 귀 안쪽 흰색 */}
        <mesh castShadow position={[-0.2, 0.32, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshStandardMaterial color={whiteColor} />
        </mesh>
        <mesh castShadow position={[0.2, 0.32, 0]} rotation={[0, 0, Math.PI / 8]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshStandardMaterial color={whiteColor} />
        </mesh>

        {/* 눈 - 날카로운 느낌 */}
        <mesh ref={leftEyeRef} castShadow position={[-0.15, 0.05, 0.28]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh ref={rightEyeRef} castShadow position={[0.15, 0.05, 0.28]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 검은 코 */}
        <mesh castShadow position={[0, -0.08, 0.55]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* 푹신한 꼬리 - 여우의 상징! */}
      <mesh ref={tailRef} castShadow position={[0, 0.1, -0.8]} rotation={[Math.PI / 6, 0, 0]}>
        <coneGeometry args={[0.25, 0.9, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.9} />
      </mesh>

      {/* 꼬리 끝 흰색 */}
      <mesh castShadow position={[0, 0.5, -1.3]} rotation={[Math.PI / 6, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={whiteColor} />
      </mesh>

      {/* 다리 4개 - 가느다란 다리 */}
      {[
        [-0.2, -0.5, 0.2],
        [0.2, -0.5, 0.2],
        [-0.2, -0.5, -0.2],
        [0.2, -0.5, -0.2]
      ].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
      ))}

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.5, 0.9, 0]}>
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
