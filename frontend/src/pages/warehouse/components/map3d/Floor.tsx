// ============================================================================
// Mặt Sàn Kho Phòng Sạch, Thảm Phân Khu & Cửa Xuất Nhập Hàng
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không có mô hình cửa 3D gây cản trở tầm nhìn, dùng thảm phẳng có nhãn
// ============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ZONE_METAS } from './constants';
import { floorEpoxyMaterial } from './materials';

interface FloorProps {
  level: 'overview' | 'rack';
}

export const Floor: React.FC<FloorProps> = React.memo(({ level }) => {
  // Tạo viền phân khu 1 lần duy nhất trong useMemo
  const zoneBorders = useMemo(() => {
    return Object.entries(ZONE_METAS).map(([zoneKey, meta]) => {
      const [w, d] = meta.size;
      const boxGeo = new THREE.BoxGeometry(w, 0.01, d);
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);
      boxGeo.dispose();
      return { zoneKey, edgeGeo, hex: meta.hex };
    });
  }, []);

  return (
    <group>
      {/* 1. Sàn epoxy chính của kho */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={floorEpoxyMaterial}
        raycast={() => null} // Tắt raycast để không bắt click nhầm
      >
        <planeGeometry args={[74, 66]} />
      </mesh>

      {/* 2. Thảm của 7 Phân khu chức năng */}
      {Object.entries(ZONE_METAS).map(([zoneKey, meta], idx) => {
        const [cx, cz] = meta.center;
        const [w, d] = meta.size;
        const border = zoneBorders[idx];

        return (
          <group key={zoneKey} position={[cx, 0.005, cz]}>
            {/* Tấm thảm nền màu phân khu */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial
                color={meta.hex}
                transparent
                opacity={0.08}
                depthWrite={false}
              />
            </mesh>

            {/* Viền phân khu mỏng */}
            {border && (
              <lineSegments geometry={border.edgeGeo} raycast={() => null}>
                <lineBasicMaterial color={border.hex} transparent opacity={0.35} />
              </lineSegments>
            )}
          </group>
        );
      })}
    </group>
  );
});
