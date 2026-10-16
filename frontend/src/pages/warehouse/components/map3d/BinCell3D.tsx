import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BinItem, STATUS_COLORS } from './constants';

interface BinCell3DProps {
  bin: BinItem;
  zone: string;
  rack: string;
  shelf: number;
  position: [number, number, number];
  isHighlighted?: boolean;
  isSelected?: boolean;
  isFefoDimmed?: boolean;
  onSelect?: () => void;
  onHover?: (e: any) => void;
  onUnhover?: () => void;
}

export function BinCell3D({
  bin,
  zone,
  rack,
  shelf,
  position,
  isHighlighted = false,
  isSelected = false,
  isFefoDimmed = false,
  onSelect,
  onHover,
  onUnhover,
}: BinCell3DProps) {
  const statusCfg = STATUS_COLORS[bin.status] || STATUS_COLORS.EMPTY;
  const isEmpty = bin.status === 'EMPTY' || bin.currentStock === 0;

  // Tính chiều cao kiện hàng theo tỷ lệ tồn kho
  const maxCap = Math.max(1, bin.maxCapacity || 200);
  const fillRatio = isEmpty
    ? 0.05
    : Math.min(1.15, Math.max(0.12, bin.currentStock / maxCap));
  const boxHeight = fillRatio * 0.58;

  // Độ mờ khi bật chế độ FEFO X-Ray
  const opacity = isFefoDimmed ? 0.25 : 1.0;

  const stockBoxMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: statusCfg.hex,
      roughness: 0.35,
      metalness: 0.1,
      transparent: opacity < 1.0,
      opacity: opacity,
      emissive: isHighlighted || isSelected ? statusCfg.hex : '#000000',
      emissiveIntensity: isHighlighted || isSelected ? 0.45 : 0,
    });
  }, [statusCfg.hex, opacity, isHighlighted, isSelected]);

  return (
    <group position={position}>
      {/* 1. Khay đế của Ô Thùng (Bin Tray Base) */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[0.82, 0.06, 1.32]} />
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : '#e2e8f0'}
          roughness={0.5}
        />
      </mesh>

      {/* 2. Khối thuốc/kiện hàng bên trong ô thùng */}
      {!isEmpty ? (
        <mesh
          position={[0, 0.06 + boxHeight / 2, 0]}
          material={stockBoxMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.76, boxHeight, 1.22]} />
        </mesh>
      ) : (
        /* Thùng trống: Khung viền nét mờ bán trong suốt */
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.76, 0.12, 1.22]} />
          <meshBasicMaterial
            color="#cbd5e1"
            wireframe
            transparent
            opacity={0.35}
          />
        </mesh>
      )}

      {/* 3. Huy hiệu Lô Dự Trữ FEFO (khi hasReserveBatch = true) */}
      {bin.hasReserveBatch && (
        <group position={[0, 0.06 + boxHeight + 0.15, 0]}>
          {/* Viên kim cương phát sáng màu hổ phách */}
          <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#f59e0b"
              emissiveIntensity={1.2}
              roughness={0.2}
            />
          </mesh>
          {/* Vòng phát sáng quanh miệng thùng */}
          <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.22, 16]} />
            <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 4. Viền sáng nhấp nháy khi được Highlight hoặc Đang Chọn */}
      {(isHighlighted || isSelected) && (
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.84, 0.72, 1.34]} />
          <meshBasicMaterial
            color={isSelected ? '#0284c7' : '#38bdf8'}
            wireframe
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* 5. Hitbox tàng hình bắt sự kiện Click & Hover dễ dàng */}
      <mesh
        position={[0, 0.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.({
            type: 'bin',
            zone,
            rack,
            shelf,
            bin: bin.binNo,
            title: `Thùng B${bin.binNo} — ${bin.medicineName || 'Trống'}`,
            subtitle: `Khu ${zone} · Kệ ${rack} · Tầng ${shelf}`,
            stock: bin.currentStock,
            status: bin.status,
            badge: bin.hasReserveBatch ? 'Có lô cũ ở Khu Dự Trữ (FEFO)' : undefined,
            screenX: e.clientX,
            screenY: e.clientY,
          });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover?.();
        }}
      >
        <boxGeometry args={[0.86, 0.8, 1.36]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
