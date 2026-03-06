import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, Group } from "three";
import { useBlinkAnimation, updateBlinkAnimation, type AnimalModelProps } from "./animalUtils";

export function TurtleModel({ state, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: AnimalModelProps) {
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
    const baseHeadZ = 0.5;

    switch (state) {
      case "idle":
        // 등껍질 안으로 머리 살짝 숨기기
        headRef.current.position.z = baseHeadZ + Math.sin(time * 0.001) * 0.05;
        groupRef.current.position.y = Math.sin(time * 0.001) * 0.01;
        break;
      case "thinking":
        // 천천히 고개만 들락날락
        headRef.current.position.z = baseHeadZ + Math.sin(time * 0.002) * 0.1;
        break;
      case "working":
        // 다른 동물보다 50% 느린 애니메이션
        groupRef.current.position.y = Math.abs(Math.sin(time * 0.005)) * 0.05;
        headRef.current.position.z = baseHeadZ;
        break;
      case "completed":
        groupRef.current.rotation.y += delta * 1.5;
        break;
      case "error":
        groupRef.current.rotation.z = Math.sin(time * 0.015) * 0.08;
        break;
    }
  });

  const shellColor = "#556B2F"; // 등껍질 초록-갈색
  const bodyColor = "#6B8E23"; // 몸체 녹색
  const lightColor = "#C4A969"; // 밝은 베이지

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* 등껍질 - 거북이의 상징! */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shellColor} roughness={0.8} />
      </mesh>

      {/* 등껍질 무늬 (육각형 패턴) */}
      {[
        [0, 0.45, 0],
        [-0.15, 0.42, 0.15],
        [0.15, 0.42, 0.15],
        [-0.15, 0.42, -0.15],
        [0.15, 0.42, -0.15]
      ].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.02, 6]} />
          <meshStandardMaterial color="#3D5229" />
        </mesh>
      ))}

      {/* 배 부분 */}
      <mesh castShadow position={[0, 0, 0]}>
        <sphereGeometry args={[0.45, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={lightColor} />
      </mesh>

      {/* 머리 - 작고 길쭉함 */}
      <group ref={headRef} position={[0, 0.15, 0.5]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.12, 0.25, 16, 32]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>

        {/* 눈 - 작고 귀여움 */}
        <mesh ref={leftEyeRef} castShadow position={[-0.08, 0.05, 0.12]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh ref={rightEyeRef} castShadow position={[0.08, 0.05, 0.12]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* 입 - 미소 */}
        <mesh castShadow position={[0, -0.02, 0.13]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.06, 0.01, 8, 16, Math.PI]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      </group>

      {/* 다리 4개 - 짧고 통통함 */}
      {[
        [-0.35, 0, 0.25],  // 왼쪽 앞
        [0.35, 0, 0.25],   // 오른쪽 앞
        [-0.35, 0, -0.25], // 왼쪽 뒤
        [0.35, 0, -0.25]   // 오른쪽 뒤
      ].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]}>
          <capsuleGeometry args={[0.08, 0.15, 8, 16]} />
          <meshStandardMaterial color={bodyColor} />
        </mesh>
      ))}

      {/* 꼬리 - 아주 작음 */}
      <mesh ref={tailRef} castShadow position={[0, 0.05, -0.45]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>

      {/* 상태별 이펙트 */}
      {state === "thinking" && (
        <group position={[0.5, 0.7, 0]}>
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
