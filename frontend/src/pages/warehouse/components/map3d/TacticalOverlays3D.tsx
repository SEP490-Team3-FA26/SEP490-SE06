import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  ZONE_METAS,
  RACK_PLACEMENTS,
  parseWarehouseTargetId,
} from './constants';
import { SelectedEntity } from './useWarehouse3DState';

interface TacticalOverlays3DProps {
  selectedEntity?: SelectedEntity | null;
  highlightTarget?: string;
  rackLayoutCache?: Record<string, any>;
}

export function TacticalOverlays3D({
  selectedEntity,
  highlightTarget,
}: TacticalOverlays3DProps) {
  const arcMeshRef = useRef<THREE.Line | null>(null);
  const wayfindingMeshRef = useRef<THREE.Line | null>(null);

  // 1. TÍNH TOÁN CUNG LIÊN KẾT FEFO (QUADRATIC BEZIER ARC TO RESERVE ZONE)
  const fefoArcPoints = useMemo(() => {
    // Chỉ kích hoạt khi đang chọn một ô thùng có hasReserveBatch
    if (selectedEntity?.type === 'bin' && selectedEntity.data?.hasReserveBatch && selectedEntity.rack) {
      const placement = RACK_PLACEMENTS[selectedEntity.rack];
      if (!placement) return null;

      const [rx, , rz] = placement.position;
      const binNo = selectedEntity.bin || 1;
      const binOffsetX = -4.05 + (binNo - 0.5) * 0.90;
      const shelfY = (selectedEntity.shelf || 1) * 0.9;

      const start = new THREE.Vector3(rx + binOffsetX, shelfY + 0.3, rz);
      const end = new THREE.Vector3(ZONE_METAS.RESERVE.center[0], 2.0, ZONE_METAS.RESERVE.center[1]);

      // Điểm uốn cong ở giữa trên cao
      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        Math.max(start.y, end.y) + 7.5,
        (start.z + end.z) / 2
      );

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      return curve.getPoints(40);
    }
    return null;
  }, [selectedEntity]);

  const fefoArcGeo = useMemo(() => {
    if (!fefoArcPoints) return null;
    return new THREE.BufferGeometry().setFromPoints(fefoArcPoints);
  }, [fefoArcPoints]);

  // 2. TÍNH TOÁN ĐƯỜNG DẪN WAYFINDING DƯỚI MẶT SÀN TỚI MỤC TIÊU TÌM KIẾM
  const wayfindingPoints = useMemo(() => {
    if (!highlightTarget) return null;
    const parsed = parseWarehouseTargetId(highlightTarget);
    if (!parsed) return null;

    const placement = RACK_PLACEMENTS[parsed.rack];
    if (!placement) return null;

    const [targetX, , targetZ] = placement.position;
    const startPoint = new THREE.Vector3(-11, 0.04, -19); // Xuất phát từ nút giao hành lang chính
    const cornerPoint1 = new THREE.Vector3(-11, 0.04, targetZ);
    const endPoint = new THREE.Vector3(targetX, 0.04, targetZ);

    return [startPoint, cornerPoint1, endPoint];
  }, [highlightTarget]);

  const wayfindingGeo = useMemo(() => {
    if (!wayfindingPoints) return null;
    return new THREE.BufferGeometry().setFromPoints(wayfindingPoints);
  }, [wayfindingPoints]);

  // Hiệu ứng nhịp thở / sóng xung kích
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (arcMeshRef.current) {
      const mat = arcMeshRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.opacity = 0.5 + Math.sin(t * 5) * 0.35;
      }
    }
    if (wayfindingMeshRef.current) {
      const mat = wayfindingMeshRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.opacity = 0.6 + Math.sin(t * 6) * 0.3;
      }
    }
  });

  return (
    <group name="TacticalOverlays">
      {/* Cung năng lượng màu Hổ phách nối từ Thùng hàng sang Khu Dự Trữ */}
      {fefoArcGeo && (
        <group>
          <primitive
            ref={arcMeshRef}
            object={new THREE.Line(
              fefoArcGeo,
              new THREE.LineBasicMaterial({
                color: '#f59e0b',
                linewidth: 3,
                transparent: true,
                opacity: 0.85,
              })
            )}
          />
          {/* Điểm đáp phát sáng tại Khu Dự Trữ */}
          <mesh position={[ZONE_METAS.RESERVE.center[0], 0.05, ZONE_METAS.RESERVE.center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 2.2, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* Đường dẫn Wayfinding sáng rực chạy dọc hành lang */}
      {wayfindingGeo && (
        <primitive
          ref={wayfindingMeshRef}
          object={new THREE.Line(
            wayfindingGeo,
            new THREE.LineBasicMaterial({
              color: '#38bdf8',
              linewidth: 4,
              transparent: true,
              opacity: 0.9,
            })
          )}
        />
      )}
    </group>
  );
}
