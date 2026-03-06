interface DeskModelProps {
  position: [number, number, number];
}

export function DeskModel({ position }: DeskModelProps) {
  return (
    <group position={position}>
      {/* 상판 */}
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#8B7355" roughness={0.7} />
      </mesh>

      {/* 다리 4개 */}
      {[
        [-0.5, 0.35, -0.35],
        [0.5, 0.35, -0.35],
        [-0.5, 0.35, 0.35],
        [0.5, 0.35, 0.35]
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7]} />
          <meshStandardMaterial color="#6B5344" />
        </mesh>
      ))}

      {/* 노트북 (장식) */}
      <mesh position={[0, 0.75, -0.15]} rotation={[-Math.PI / 12, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.01, 0.4]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* 노트북 화면 */}
      <mesh position={[0, 0.95, -0.15]} rotation={[Math.PI / 3, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.01, 0.35]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}
