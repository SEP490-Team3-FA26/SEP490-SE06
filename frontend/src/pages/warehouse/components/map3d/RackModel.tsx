// ============================================================================
// Mô Hình Dãy Kệ Chuẩn (RackModel - Khung Thép + 4 Dải Tầng + 1 Hitbox)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// ============================================================================

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import {
  RACK_DIMENSIONS,
  RACK_PLACEMENTS,
  STATUS_COLORS,
  WarehouseStatus,
  ShelfSummary,
} from './constants';
import type { View } from './store';
import {
  uprightGeometry,
  topBeamLongGeometry,
  topBeamSideGeometry,
  shelfBandGeometry,
  rackHitboxGeometry,
  shadowPlateGeometry,
  beaconCylinderGeometry,
  beaconHaloGeometry,
  beaconColumnMaterial,
  beaconHaloMaterial,
  steelNormalMaterial,
  steelGhostMaterial,
  shadowPlateMaterial,
  statusNormalMaterials,
  statusGhostMaterials,
} from './materials';

interface RackModelProps {
  rack: string;
  zone: string;
  shelves?: ShelfSummary[];
  view: View;
  isHovered: boolean;
  onHover: (rack: string | null) => void;
  onSelect: (rack: string) => void;
  matchSet?: Set<string> | null;
  warnOnly?: boolean;
  isSearchTarget?: boolean;
}

export type RackVisual = 'normal' | 'ghost' | 'hidden';

function getRackVisual(
  rack: string,
  view: View,
  ctx: {
    matchSet: Set<string> | null;
    warnOnly: boolean;
    rackHasWarning: boolean;
    D: number;
  }
): RackVisual {
  if (view.level === 'rack') {
    if (rack === view.rack) return 'normal';

    const t = RACK_PLACEMENTS[view.rack]?.position || [0, 0, 0];
    const p = RACK_PLACEMENTS[rack]?.position || [0, 0, 0];

    const dx = p[0] - t[0];
    const dz = p[2] - t[2];
    const distSq = dx * dx + dz * dz;

    const isSameColumn = Math.abs(dx) < RACK_DIMENSIONS.width / 2 + 1.5;
    const isInFrontOfTarget = p[2] > t[2] && p[2] < t[2] + ctx.D + 2;

    // Ẩn hoàn toàn kệ che camera phía trước hoặc các kệ ở quá xa (> 22m) để tối ưu render
    if ((isSameColumn && isInFrontOfTarget) || distSq > 484) {
      return 'hidden';
    }
    return 'ghost';
  }

  // Chế độ Tổng quan (Overview): KHÔNG làm mờ cả kho khi search
  // Giữ nguyên các kệ khác sắc nét, kệ khớp sẽ phát sáng nổi bật
  if (ctx.warnOnly && !ctx.rackHasWarning) {
    return 'ghost';
  }
  return 'normal';
}

export const RackModel: React.FC<RackModelProps> = React.memo(({
  rack,
  zone,
  shelves = [],
  view,
  isHovered,
  onHover,
  onSelect,
  matchSet = null,
  warnOnly = false,
  isSearchTarget = false,
}) => {
  const placement = RACK_PLACEMENTS[rack];
  if (!placement) return null;

  const { worstStatus, warningCount, totalStock } = useMemo(() => {
    let worst: WarehouseStatus = 'EMPTY';
    let warnCount = 0;
    let stock = 0;

    const rank: Record<WarehouseStatus, number> = {
      EXPIRED: 4,
      NEAR_EXPIRY: 3,
      LOW_STOCK: 2,
      NORMAL: 1,
      EMPTY: 0,
    };

    shelves.forEach((s) => {
      stock += s.totalStock || 0;
      if (s.status === 'EXPIRED' || s.status === 'NEAR_EXPIRY' || s.status === 'LOW_STOCK') {
        warnCount++;
      }
      if (rank[s.status] > rank[worst]) {
        worst = s.status;
      }
    });

    return { worstStatus: worst, warningCount: warnCount, totalStock: stock };
  }, [shelves]);

  const rackHasWarning = warningCount > 0;
  const isOverview = view.level === 'overview';
  const isCurrentRack = view.level === 'rack' && view.rack === rack;

  const visual = getRackVisual(rack, view, {
    matchSet,
    warnOnly,
    rackHasWarning,
    D: 9.5,
  });

  if (visual === 'hidden') {
    return null;
  }

  const isGhost = visual === 'ghost';
  const steelMat = isGhost ? steelGhostMaterial : steelNormalMaterial;

  const { width, depth, height, shelfHeights } = RACK_DIMENSIONS;
  const halfW = width / 2 - 0.05;
  const halfD = depth / 2 - 0.05;

  return (
    <group
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
    >
      {/* 1. Tấm bóng giả dưới chân kệ */}
      {!isGhost && (
        <mesh
          position={[0, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={shadowPlateGeometry}
          material={shadowPlateMaterial}
          raycast={() => null}
        />
      )}

      {/* 2. Bốn cột thép đứng ở 4 góc kệ */}
      <mesh
        position={[-halfW, height / 2, -halfD]}
        geometry={uprightGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[halfW, height / 2, -halfD]}
        geometry={uprightGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[-halfW, height / 2, halfD]}
        geometry={uprightGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[halfW, height / 2, halfD]}
        geometry={uprightGeometry}
        material={steelMat}
        raycast={() => null}
      />

      {/* 2.1. Khung giằng thép đỉnh kệ kết nối 4 cột trụ */}
      <mesh
        position={[0, height, -halfD]}
        geometry={topBeamLongGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[0, height, halfD]}
        geometry={topBeamLongGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[-halfW, height, 0]}
        geometry={topBeamSideGeometry}
        material={steelMat}
        raycast={() => null}
      />
      <mesh
        position={[halfW, height, 0]}
        geometry={topBeamSideGeometry}
        material={steelMat}
        raycast={() => null}
      />

      {/* 3. Bốn dải tầng kệ */}
      {shelfHeights.map((yPos, idx) => {
        const shelfNo = idx + 1;
        const sh = shelves.find((s) => s.shelf === shelfNo);
        const status = sh ? sh.status : 'EMPTY';

        const shelfMat = isGhost
          ? statusGhostMaterials[status] || statusGhostMaterials.EMPTY
          : isCurrentRack
          ? steelNormalMaterial
          : statusNormalMaterials[status] || statusNormalMaterials.EMPTY;

        return (
          <mesh
            key={shelfNo}
            position={[0, yPos, 0]}
            geometry={shelfBandGeometry}
            material={shelfMat}
            raycast={() => null}
          />
        );
      })}

      {/* 4. Cột Beacon vươn cao + Hào quang phát sáng khi kệ được tìm kiếm đích */}
      {isSearchTarget && isOverview && (
        <group position={[0, height, 0]}>
          {/* Cột sáng vươn cao 14m phát sáng vàng hổ phách */}
          <mesh
            position={[0, 7.0, 0]}
            geometry={beaconCylinderGeometry}
            material={beaconColumnMaterial}
            raycast={() => null}
          />
          {/* Vòng hào quang phát sáng ở nóc kệ */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]}
            geometry={beaconHaloGeometry}
            material={beaconHaloMaterial}
            raycast={() => null}
          />
        </group>
      )}

      {/* 5. Hitbox duy nhất cho cả kệ ở Overview mode */}
      {isOverview && (
        <mesh
          position={[0, height / 2, 0]}
          geometry={rackHitboxGeometry}
          visible={false}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
            onHover(rack);
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
            onHover(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(rack);
          }}
        />
      )}

      {/* 6. Nhãn tên kệ trên nóc: Kích thước tĩnh chuẩn, không nhấp nháy, không đè kệ khác */}
      {isOverview && !isGhost && (
        <Html
          position={[0, height + 0.25, 0]}
          zIndexRange={[10, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`transition-all duration-150 select-none flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${
              isSearchTarget
                ? 'bg-amber-300 text-slate-950 border-amber-500 font-black shadow-sm'
                : isHovered
                ? 'bg-slate-900 text-white border-sky-400 scale-110 shadow-md ring-2 ring-sky-300'
                : 'bg-white/95 text-slate-800 border-slate-300'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: isSearchTarget ? '#d97706' : STATUS_COLORS[worstStatus]?.hex || '#94a3b8' }}
            />
            <span className="font-mono">{rack}</span>

            {warningCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1 rounded-full leading-tight font-semibold">
                {warningCount}
              </span>
            )}

            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-900/95 text-white p-2 rounded-lg text-[10px] shadow-xl border border-slate-700 pointer-events-none text-left font-normal leading-normal z-50">
                <div className="font-bold text-sky-400 text-xs mb-0.5">
                  Khu {zone} · Kệ {rack}
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tổng tồn:</span>
                  <span className="font-semibold text-white">{totalStock.toLocaleString('vi-VN')} đv</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Trạng thái:</span>
                  <span style={{ color: STATUS_COLORS[worstStatus]?.hex }}>
                    {STATUS_COLORS[worstStatus]?.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});
