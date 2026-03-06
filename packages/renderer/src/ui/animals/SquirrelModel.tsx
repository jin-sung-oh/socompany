import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { useBlinkAnimation, updateBlinkAnimation, type AnimalModelProps } from "./animalUtils";

export function SquirrelModel({ state, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AnimalModelProps) {
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
        groupRef.current.position.y = Math.sin(time * 0.003) * 0.04;
        headRef.current.rotation.x = Math.sin(time * 0.002) * 0.06;
        tailRef.current.rotation.x = Math.PI / 3 + Math.sin(time * 0.005) * 0.15;
        break;
      case "thinking":
        // 앞발로 머리 긁는 듯한 모션
        headRef.current.rotation.z = Math.sin(time * 0.01) * 0.1;
        headRef.current.rotation.y = Math.sin(time * 0.004) * 0.12;
        break;
      case "working":
        // 매우 빠르게 움직임 (바쁜 느낌)
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.025)) * 0.15;
        tailRef.current.rotation.x = Math.PI / 3 + Math.sin(time * 0.03) * 0.3;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 3;
        break;
      case "error":
        groupRef.current.rotation.z = Math.sin(time * 0.015) * 0.08;
        break;
    }
  });

  const bodyColor = "#CD853F"; // 다람쥐 갈색
  const lightColor = "#F5DEB3"; // 밝은 베이지

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* 몸통 - 작고 타원형 */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.25, 0.5, 16, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} />
      </mesh>

      {/* 배 부분 - 밝은 색 */}
      <mesh castShadow position={[0, -0.05, 0.22]}>
        <sphereGeometry args={[0.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={lightColor} />
      </mesh>

      {/* 머리 - 둥글게 */}
      <group ref={headRef} position={[0, 0.4, 0.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* 큰 눈 */}
        <mesh ref={leftEyeRef} castShadow position={[-0.12, 0.05, 0.2]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh ref={rightEyeRef} castShadow position={[0.12, 0.05, 0.2]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 작은 코 */}
        <mesh castShadow position={[0, 0, 0.25]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 귀 - 뾰족하고 작게 */}
        <mesh castShadow position={[-0.15, 0.22, -0.05]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
        <mesh castShadow position={[0.15, 0.22, -0.05]}>
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* 앞니 2개 */}
        <mesh castShadow position={[-0.03, -0.05, 0.24]}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh castShadow position={[0.03, -0.05, 0.24]}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      </group>

      {/* 거대한 꼬리 - 다람쥐의 상징! */}
      <mesh ref={tailRef} castShadow position={[0, 0.3, -0.6]} rotation={[Math.PI / 3, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>

      {/* 짧은 다리 4개 */}
      {[
        [-0.15, -0.35, 0.1],
        [0.15, -0.35, 0.1],
        [-0.15, -0.35, -0.1],
        [0.15, -0.35, -0.1]
      ].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.04, 0.04, 0.2]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
      ))}

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.4, 0.7, 0]}>
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
