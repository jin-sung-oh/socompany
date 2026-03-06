import * as THREE from "three";

export function OfficeEnvironment() {
  return (
    <>
      {/* 바닥 - 나무 질감 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#d4c4a8"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* 메인 조명 - 천장 조명 느낌 */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* 보조 조명 - 따뜻한 분위기 */}
      <pointLight position={[-5, 3, -3]} intensity={0.4} color="#f7b267" />
      <pointLight position={[5, 3, -3]} intensity={0.4} color="#f7b267" />

      {/* 뒷벽 (optional) */}
      <mesh position={[0, 2, -4]} receiveShadow>
        <planeGeometry args={[20, 4]} />
        <meshStandardMaterial color="#e8e8e8" side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
