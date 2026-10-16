// ============================================================================
// Mô Hình 40 Thùng Hàng Của Dãy Kệ Đang Xem (RackBins - 4 Tầng x 10 Thùng)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Chỉ render cho đúng 1 kệ đang xem. Thùng thật, không bịa dữ liệu khi lỗi.
// ============================================================================

import React from 'react';
import { Html } from '@react-three/drei';
import {
  RACK_DIMENSIONS,
  RACK_PLACEMENTS,
  STATUS_COLORS,
  ShelfBinLayout,
  BinItem,
  parseWarehouseTargetId,
} from './constants';
import type { RackLayoutStatus } from './useRackLayout';
import {
  binUnitGeometry,
  binHitboxGeometry,
  statusNormalMaterials,
  statusDimMaterials,
} from './materials';

interface RackBinsProps {
  rack: string;
  layout?: ShelfBinLayout[];
  status: RackLayoutStatus;
  errorMessage?: string | null;
  retry?: () => void;
  shelfFocus: number | null;
  selectedBin: number | null;
  highlightTarget?: string;
  warnOnly?: boolean;
  isModalOpen?: boolean;
  onSelectBin: (shelf: number, bin: number) => void;
}

export const RackBins: React.FC<RackBinsProps> = React.memo(({
  rack,
  layout,
  status,
  errorMessage,
  retry,
  shelfFocus,
  selectedBin,
  highlightTarget,
  warnOnly = false,
  isModalOpen = false,
  onSelectBin,
}) => {
  const placement = RACK_PLACEMENTS[rack];
  if (!placement) return null;

  const parsedHighlight = parseWarehouseTargetId(highlightTarget);
  const isTargetThisRack = parsedHighlight?.rack === rack;

  const { shelfHeights, binSpacing, maxBinHeight } = RACK_DIMENSIONS;

  return (
    <group
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
    >
      {/* 1. Trạng thái Đang tải Layout */}
      {status === 'loading' && (
        <Html position={[0, 2.4, 1.2]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md shadow-xl flex items-center gap-2 border border-slate-700 animate-pulse">
            <span className="w-2.5 h-2.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            Đang tải sơ đồ 40 thùng kệ {rack}...
          </div>
        </Html>
      )}

      {/* 2. Trạng thái Lỗi tải - Tuyệt đối KHÔNG hiển thị thùng trống giả */}
      {status === 'error' && (
        <Html position={[0, 2.4, 1.2]} center>
          <div className="bg-red-50 text-red-900 p-4 rounded-2xl text-xs font-semibold shadow-xl border border-red-200 flex flex-col items-center gap-2 max-w-xs text-center">
            <div className="text-red-600 font-bold">Không thể tải dữ liệu thùng kệ {rack}</div>
            <div className="text-[11px] text-red-500 font-normal">{errorMessage || 'Lỗi kết nối máy chủ'}</div>
            {retry && (
              <button
                type="button"
                onClick={retry}
                className="mt-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer shadow-xs transition"
              >
                Thử lại ngay
              </button>
            )}
          </div>
        </Html>
      )}

      {/* 3. Trạng thái Đã sẵn sàng (Ready): Vẽ 4 Tầng x 10 Thùng */}
      {status === 'ready' && layout && (
        <group>
          {layout.map((sh) => {
            const shelfNo = sh.shelfNo;
            const yBase = shelfHeights[shelfNo - 1] + 0.12;
            const isShelfDim = shelfFocus !== null && shelfFocus !== shelfNo;

            return (
              <group key={shelfNo}>
                {sh.bins.map((binItem: BinItem) => {
                  const binNo = binItem.binNo;
                  const xPos = -4.05 + (binNo - 0.5) * binSpacing;

                  const isSelected = shelfFocus === shelfNo && selectedBin === binNo;
                  const isHighlighted =
                    isTargetThisRack &&
                    parsedHighlight?.shelf === shelfNo &&
                    parsedHighlight?.binNo === binNo;

                  const binStatus = binItem.status || 'EMPTY';
                  const isEmpty = binStatus === 'EMPTY' || binItem.currentStock === 0;

                  // Cố định chiều cao đồng nhất cho mọi thùng có hàng (an toàn = hết hạn)
                  const UNIFORM_BIN_HEIGHT = 0.45;
                  const boxHeight = isEmpty ? 0.04 : UNIFORM_BIN_HEIGHT;
                  const capacity = binItem.maxCapacity || 200;

                  // Vật liệu khối hàng
                  const mat = isShelfDim
                    ? statusDimMaterials[binStatus] || statusDimMaterials.EMPTY
                    : statusNormalMaterials[binStatus] || statusNormalMaterials.EMPTY;

                  // Ẩn nếu bật chế độ "Chỉ hiện cảnh báo" mà thùng an toàn/trống
                  if (warnOnly && (binStatus === 'NORMAL' || binStatus === 'EMPTY') && !isHighlighted && !isSelected) {
                    return null;
                  }

                  return (
                    <group key={binNo} position={[xPos, yBase, 0]}>
                      {/* Khối hàng thực tế - kích thước đồng nhất */}
                      <mesh
                        position={[0, boxHeight / 2, 0]}
                        scale={[1, boxHeight, 1]}
                        geometry={binUnitGeometry}
                        material={mat}
                        raycast={() => null}
                      />

                      {/* Hitbox bắt click trên toàn bộ không gian ô thùng */}
                      <mesh
                        position={[0, 0.45, 0]}
                        geometry={binHitboxGeometry}
                        visible={false}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          document.body.style.cursor = 'pointer';
                        }}
                        onPointerOut={() => {
                          document.body.style.cursor = 'auto';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBin(shelfNo, binNo);
                        }}
                      />

                      {/* Thẻ nhãn thông tin mặt trước - ẩn hoàn toàn khi modal mở, z-index tối đa 10 */}
                      {!isModalOpen && (
                        <Html
                          position={[0, 0.40, 0.72]}
                          zIndexRange={[10, 0]}
                          center
                          style={{ pointerEvents: 'none' }}
                        >
                          <div
                            className={`w-[84px] min-h-[58px] p-1 rounded-lg text-[9px] border backdrop-blur-xs shadow-xs transition-all select-none leading-tight flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300 shadow-md scale-105'
                              : isHighlighted
                              ? 'bg-amber-400 text-slate-950 border-amber-500 ring-4 ring-amber-300 animate-pulse font-bold'
                              : 'bg-white/95 text-slate-800 border-slate-200'
                          } ${isShelfDim ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div>
                            {/* Hàng 1: Mã thùng + Cờ FEFO + Chấm trạng thái */}
                            <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                              <span className="flex items-center gap-0.5">
                                <span>B{binNo}</span>
                                {binItem.hasReserveBatch && (
                                  <span title="Có lô cũ ở Khu Dự Trữ" className="text-amber-500">⚡</span>
                                )}
                              </span>
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: STATUS_COLORS[binStatus]?.hex || '#94a3b8' }}
                              />
                            </div>

                            {/* Hàng 2: Tên thuốc */}
                            <div
                              className={`font-semibold text-[9px] my-0.5 line-clamp-1 ${
                                isSelected ? 'text-white' : 'text-slate-900'
                              }`}
                              title={binItem.medicineName || 'Thùng trống'}
                            >
                              {binItem.medicineName ? binItem.medicineName : 'Trống'}
                            </div>
                          </div>

                          <div>
                            {/* Hàng 3: Tồn kho & Thanh tiến trình */}
                            <div className="text-[8px] flex justify-between font-mono">
                              <span>{binItem.currentStock}</span>
                              <span className="opacity-70">/{capacity}</span>
                            </div>
                            <div className="w-full bg-slate-200/80 rounded-full h-1 mt-0.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (binItem.currentStock / capacity) * 100)}%`,
                                  backgroundColor: isSelected ? '#ffffff' : STATUS_COLORS[binStatus]?.hex || '#94a3b8',
                                }}
                              />
                            </div>

                            {/* Hàng 4: Hạn dùng gần nhất nếu cận hạn hoặc hết hạn */}
                            {(binStatus === 'NEAR_EXPIRY' || binStatus === 'EXPIRED') && binItem.nearestExpDate ? (
                              <div
                                className={`text-[8px] font-bold mt-0.5 truncate ${
                                  isSelected ? 'text-amber-200' : 'text-orange-600'
                                }`}
                              >
                                HSD: {binItem.nearestExpDate.slice(0, 7)}
                              </div>
                            ) : (
                              <div className="text-[8px] opacity-40 mt-0.5 truncate font-mono">
                                FEFO OK
                              </div>
                            )}
                          </div>
                        </div>
                      </Html>
                    )}
                  </group>
                );
                })}
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
});
