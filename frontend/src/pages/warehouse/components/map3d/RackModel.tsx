// ============================================================================
// Mô Hình Dãy Kệ Chuẩn (RackModel - Khung Thép + 4 Dải Tầng + 1 Hitbox)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không có hitbox tầng/thùng ở Overview. Tối ưu hiệu năng bằng vật liệu dùng chung.
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
  shelfBandGeometry,
  rackHitboxGeometry,
  shadowPlateGeometry,
  beaconCylinderGeometry,
  beaconColumnMaterial,
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

// Hàm xác định trạng thái hiển thị của kệ theo Mục 4.6
export function getRackVisual(
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

    // Kiểm tra xem kệ này có nằm chắn trực diện giữa camera và kệ đích không
    // Kệ chắn: cùng cột X xấp xỉ, và nằm phía trước kệ đích (Z lớn hơn đích nhưng nhỏ hơn vị trí camera)
    const isSameColumn = Math.abs(p[0] - t[0]) < RACK_DIMENSIONS.width / 2 + 1;
    const isInFrontOfTarget = p[2] > t[2] && p[2] < t[2] + ctx.D + 1;

    if (isSameColumn && isInFrontOfTarget) {
      return 'hidden'; // Ẩn hẳn kệ chắn phía trước để không che tầm nhìn
    }
    return 'ghost'; // Các kệ còn lại hiển thị dạng bóng ma mờ để giữ cảm nhận không gian
  }

  // Ở chế độ Tổng quan (Overview)
  if (ctx.matchSet && !ctx.matchSet.has(rack)) {
    return 'ghost';
  }
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

  // Tính trạng thái xấu nhất và tổng số cảnh báo của kệ
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

  // Khoảng cách D dự kiến của camera khi ở RACK view (~8.5m)
  const visual = getRackVisual(rack, view, {
    matchSet,
    warnOnly,
    rackHasWarning,
    D: 8.5,
  });

  if (visual === 'hidden') {
    return null; // Ẩn hoàn toàn khỏi scene
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

      {/* 3. Bốn dải tầng màu thể hiện trạng thái (T1..T4) */}
      {shelfHeights.map((yPos, idx) => {
        const shelfNo = idx + 1;
        const sh = shelves.find((s) => s.shelf === shelfNo);
        const status = sh ? sh.status : 'EMPTY';
        const shelfMat = isGhost
          ? statusGhostMaterials[status] || statusGhostMaterials.EMPTY
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

      {/* 4. Cột Beacon tĩnh khi kệ được tìm kiếm đích */}
      {isSearchTarget && isOverview && (
        <mesh
          position={[0, height + 4.5, 0]}
          geometry={beaconCylinderGeometry}
          material={beaconColumnMaterial}
          raycast={() => null}
        />
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

      {/* 6. Thẻ nhãn trên nóc kệ */}
      {(isOverview || isCurrentRack) && (
        <Html
          position={[0, height + 0.35, 0]}
          zIndexRange={[10, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`transition-all duration-200 select-none flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border backdrop-blur-xs shadow-xs ${
              isCurrentRack
                ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300'
                : isHovered
                ? 'bg-white text-slate-900 border-blue-500 scale-110 shadow-md ring-2 ring-blue-400'
                : 'bg-white/95 text-slate-700 border-slate-300'
            }`}
          >
            {/* Chấm màu trạng thái xấu nhất */}
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: STATUS_COLORS[worstStatus]?.hex || '#94a3b8' }}
            />

            {/* Tên dãy kệ */}
            <span className="font-mono">{rack}</span>

            {/* Số lượng cảnh báo nếu có */}
            {warningCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1 rounded-full leading-tight font-semibold">
                {warningCount}
              </span>
            )}

            {/* Hover preview tooltip chi tiết */}
            {isHovered && isOverview && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-900/95 text-white p-2 rounded-lg text-[10px] shadow-xl border border-slate-700 pointer-events-none text-left font-normal leading-normal z-50">
                <div className="font-bold text-sky-400 text-xs mb-0.5">
                  Khu {zone} · Dãy {rack}
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
                {warningCount > 0 && (
                  <div className="text-amber-400 font-semibold mt-0.5">
                    Có {warningCount} tầng cần lưu ý
                  </div>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
});
