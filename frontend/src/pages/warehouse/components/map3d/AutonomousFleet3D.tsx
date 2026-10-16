import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface AgvConfig {
  id: string;
  speed: number;
  color: string;
  boxColor: string;
  waypoints: [number, number][]; // [X, Z]
}

// 3 Lộ trình di chuyển tuần hoàn của robot AGV nội bộ kho
const AGV_FLEET: AgvConfig[] = [
  {
    id: 'AGV-01-INBOUND',
    speed: 0.12,
    color: '#0284c7', // Xanh điện
    boxColor: '#34d399',
    waypoints: [
      [-20, -25], // Cửa Nhập Inbound
      [-20, -19], // Vào hành lang Bắc
      [-11, -19], // Ngã tư hành lang chính
      [-11, 19],  // Xuống hành lang Nam
      [20, 19],   // Tiến tới Cửa Xuất
      [20, 25],   // Trả hàng tại Outbound
      [20, 19],
      [-11, 19],
      [-11, -19],
      [-20, -19],
    ],
  },
  {
    id: 'AGV-02-RESERVE',
    speed: 0.14,
    color: '#d97706', // Hổ phách FEFO
    boxColor: '#fbbf24',
    waypoints: [
      [30, -8],  // Kệ RES1
      [17, -8],  // Hành lang tiếp vận Reserve
      [17, 19],  // Xuống hành lang Nam
      [22, 19],  // Chuyển hàng sang Outbound
      [22, 24],  // Trả hàng ưu tiên FEFO
      [22, 19],
      [17, 19],
      [17, 8],   // Kệ RES4
      [30, 8],
    ],
  },
  {
    id: 'AGV-03-INTERNAL',
    speed: 0.1,
    color: '#10b981', // Xanh y tế
    boxColor: '#60a5fa',
    waypoints: [
      [-11, -6],
      [-2, -6],
      [-2, 6],
      [-11, 6],
      [-11, 12],
      [-2, 12],
      [-2, -12],
      [-11, -12],
    ],
  },
];

function AgvVehicle({ config }: { config: AgvConfig }) {
  const meshRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);

  // Tính tổng độ dài lộ trình
  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < config.waypoints.length; i++) {
      const p1 = config.waypoints[i];
      const p2 = config.waypoints[(i + 1) % config.waypoints.length];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      len += Math.sqrt(dx * dx + dz * dz);
    }
    return len;
  }, [config.waypoints]);

  useFrame(({ clock }) => {
    if (!meshRef.current || totalLength === 0) return;

    const t = clock.getElapsedTime() * config.speed;
    const currentDist = (t * 10) % totalLength;

    // Tìm đoạn đường hiện tại
    let accum = 0;
    for (let i = 0; i < config.waypoints.length; i++) {
      const p1 = config.waypoints[i];
      const p2 = config.waypoints[(i + 1) % config.waypoints.length];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const segLen = Math.sqrt(dx * dx + dz * dz);

      if (accum + segLen >= currentDist) {
        const segProgress = (currentDist - accum) / segLen;
        const curX = p1[0] + dx * segProgress;
        const curZ = p1[1] + dz * segProgress;

        meshRef.current.position.set(curX, 0.15, curZ);

        // Hướng quay của đầu xe theo hướng di chuyển
        const angle = Math.atan2(dx, dz);
        meshRef.current.rotation.y = angle;
        break;
      }
      accum += segLen;
    }

    // Đèn cảnh báo trên nóc nhấp nháy
    if (beaconRef.current) {
      const bMat = beaconRef.current.material as THREE.MeshStandardMaterial;
      if (bMat) {
        bMat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 12) * 1.5;
      }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Khung thân xe AGV */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[1.0, 0.28, 1.6]} />
        <meshStandardMaterial color={config.color} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* 4 Bánh xe cao su */}
      {[-0.45, 0.45].map((wx, i) =>
        [-0.55, 0.55].map((wz, j) => (
          <mesh key={`${i}-${j}`} position={[wx, 0.07, wz]}>
            <boxGeometry args={[0.14, 0.14, 0.28]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Khay tải hàng và kiện hàng y tế trên lưng */}
      <mesh position={[0, 0.42, -0.1]} castShadow>
        <boxGeometry args={[0.82, 0.32, 0.95]} />
        <meshStandardMaterial color={config.boxColor} roughness={0.4} />
      </mesh>

      {/* Đèn báo hiệu khẩn cấp xoay trên nóc */}
      <mesh ref={beaconRef} position={[0, 0.35, 0.6]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 16]} />
        <meshStandardMaterial
          color="#f59e0b"
          emissive="#f59e0b"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

export function AutonomousFleet3D() {
  return (
    <group name="AutonomousFleet">
      {AGV_FLEET.map((cfg) => (
        <AgvVehicle key={cfg.id} config={cfg} />
      ))}
    </group>
  );
}
