// ============================================================================
// Mat San Kho Phong Sach & Tham Phan Khu Chuc Nang
// Du an: WDP301 - So Do Kho 3D Central Warehouse
// Mo rong san tran vien (220x180) de khong bi cat hinh thang o 2 ben man hinh
// ============================================================================

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ZONE_METAS } from './constants';
import { floorEpoxyMaterial } from './materials';

interface FloorProps {
  level: 'overview' | 'rack';
  highlightZones?: Set<string>;
}

export const Floor: React.FC<FloorProps> = React.memo(({ highlightZones }) => {
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
      {/* 1. San epoxy mo rong tran khung hinh, khong lo vien cat */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={floorEpoxyMaterial}
        raycast={() => null}
      >
        <planeGeometry args={[220, 180]} />
      </mesh>

      {/* 2. Tham cua 7 Phan khu chuc nang */}
      {Object.entries(ZONE_METAS).map(([zoneKey, meta], idx) => {
        const [cx, cz] = meta.center;
        const [w, d] = meta.size;
        const border = zoneBorders[idx];
        const isZoneHighlighted = highlightZones && highlightZones.has(zoneKey);

        return (
          <group key={zoneKey} position={[cx, 0.005, cz]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial
                color={meta.hex}
                transparent
                opacity={isZoneHighlighted ? 0.30 : 0.07}
                depthWrite={false}
              />
            </mesh>

            {border && (
              <lineSegments geometry={border.edgeGeo} raycast={() => null}>
                <lineBasicMaterial
                  color={isZoneHighlighted ? '#f59e0b' : border.hex}
                  transparent
                  opacity={isZoneHighlighted ? 0.95 : 0.4}
                />
              </lineSegments>
            )}
          </group>
        );
      })}
    </group>
  );
});
