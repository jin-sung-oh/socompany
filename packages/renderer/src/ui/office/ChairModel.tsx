interface ChairModelProps {
  position: [number, number, number];
}

export function ChairModel({ position }: ChairModelProps) {
  return (
    <group position={position}>
      {/* 좌석 */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* 등받이 */}
      <mesh position={[0, 0.75, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>

      {/* 다리 (원통형 기둥) */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.4]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* 바퀴 5개 */}
      {[0, 72, 144, 216, 288].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * 0.2;
        const z = Math.sin(rad) * 0.2;
        return (
          <mesh key={angle} position={[x, 0.02, z]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        );
      })}
    </group>
  );
}
