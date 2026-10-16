import React, { useMemo } from 'react';
import * as THREE from 'three';

export function SceneEnvironment() {
  // Đường kẻ sọc an toàn viền kho
  const safetyBorderPoints = useMemo(() => {
    const hw = 46;
    const hd = 33;
    return [
      new THREE.Vector3(-hw, 0.02, -hd),
      new THREE.Vector3(hw, 0.02, -hd),
      new THREE.Vector3(hw, 0.02, hd),
      new THREE.Vector3(-hw, 0.02, hd),
      new THREE.Vector3(-hw, 0.02, -hd),
    ];
  }, []);

  const borderGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(safetyBorderPoints);
  }, [safetyBorderPoints]);

  return (
    <group name="SceneEnvironment">
      {/* Sương mù phòng sạch y tế sáng dịu */}
      <fog attach="fog" args={['#EEF2F9', 45, 160]} />

      {/* Ánh sáng môi trường phòng sạch */}
      <ambientLight color="#ffffff" intensity={1.15} />

      {/* Đèn vòm bán cầu tạo ánh sáng tự nhiên */}
      <hemisphereLight
        args={['#f8fafc', '#cbd5e1', 0.65]}
      />

      {/* Đèn chiếu chính tạo bóng mềm công nghiệp */}
      <directionalLight
        position={[32, 50, 28]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={0.5}
        shadow-camera-far={140}
        shadow-bias={-0.0003}
      />

      {/* Đèn bù dịu màu y tế từ góc đối diện */}
      <directionalLight
        position={[-28, 24, -30]}
        intensity={0.45}
        color="#dbeafe"
      />

      {/* Mặt sàn Epoxy phòng sạch GSP */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 76]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.42}
          metalness={0.06}
        />
      </mesh>

      {/* Lưới tọa độ chìm siêu mảnh */}
      <gridHelper
        args={[96, 48, '#94a3b8', '#e2e8f0']}
        position={[0, 0.005, 0]}
      />

      {/* Vạch kẻ an toàn viền kho vàng cảnh báo */}
      <primitive object={new THREE.Line(
        borderGeometry,
        new THREE.LineBasicMaterial({ color: '#f59e0b', linewidth: 2 })
      )} />

      {/* Hành lang xe nâng Bắc (nối Inbound tới các Khu A-F) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.01, -19]}>
        <planeGeometry args={[78, 3.8]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.65} />
      </mesh>

      {/* Hành lang xe nâng Nam (nối các Khu tới Outbound) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.01, 19]}>
        <planeGeometry args={[78, 3.8]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.65} />
      </mesh>

      {/* Hành lang trục giữa (nối hành lang Bắc và Nam) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-11, 0.01, 0]}>
        <planeGeometry args={[3.6, 38]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.6} />
      </mesh>

      {/* Hành lang tiếp vận Khu Dự Trữ RESERVE */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[17, 0.01, 0]}>
        <planeGeometry args={[3.6, 38]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
