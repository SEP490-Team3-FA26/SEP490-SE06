// ============================================================================
// Giao Diện Lớp Phủ Tối Giản (Minimal HUD Overlay - Đúng 5 Vùng)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không có dữ liệu giả (bỏ nhiệt độ/độ ẩm/KPI ribbon/chu trình 5 bước)
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import {
  STATUS_COLORS,
  ZONE_METAS,
  RACK_TO_ZONE,
  ZoneSummary,
  ShelfBinLayout,
  BinItem,
} from './constants';
import type { View, Action } from './store';

interface HudProps {
  view: View;
  dispatch: React.Dispatch<Action>;
  zones: ZoneSummary[];
  layout?: ShelfBinLayout[];
  keyboardEnabled?: boolean;
  warnOnly: boolean;
  setWarnOnly: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenShelfDetail: (zone: string, rack: string, shelf: number) => void;
  onOpenBinDetail: (zone: string, rack: string, shelf: number, bin: number) => void;
  onOpenReserve?: () => void;
  onSwitchTo2D?: () => void;
}

export const Hud: React.FC<HudProps> = ({
  view,
  dispatch,
  zones,
  layout,
  keyboardEnabled = true,
  warnOnly,
  setWarnOnly,
  onOpenShelfDetail,
  onOpenBinDetail,
  onOpenReserve,
  onSwitchTo2D,
}) => {
  const [showLegend, setShowLegend] = useState(false);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState(false);

  const isOverview = view.level === 'overview';
  const activeRack = view.level === 'rack' ? view.rack : null;
  const activeZone = activeRack ? RACK_TO_ZONE[activeRack] : null;
  const activeZoneMeta = activeZone ? ZONE_METAS[activeZone] : null;


  // Thông tin ô thùng đang được chọn (nếu có)
  const selectedBinItem: BinItem | null = useMemo(() => {
    if (view.level !== 'rack' || !view.shelf || !view.bin || !layout) return null;
    const sh = layout.find((s) => s.shelfNo === view.shelf);
    return sh?.bins.find((b) => b.binNo === view.bin) || null;
  }, [view, layout]);

  // Danh sách toàn bộ cảnh báo kho (sắp xếp EXPIRED > NEAR_EXPIRY > LOW_STOCK)
  const warningList = useMemo(() => {
    const list: Array<{
      zone: string;
      rack: string;
      shelf: number;
      status: 'EXPIRED' | 'NEAR_EXPIRY' | 'LOW_STOCK';
      totalStock: number;
    }> = [];

    zones.forEach((z) => {
      z.racks?.forEach((r: any) => {
        r.shelves?.forEach((s: any) => {
          if (s.status === 'EXPIRED' || s.status === 'NEAR_EXPIRY' || s.status === 'LOW_STOCK') {
            list.push({
              zone: z.zone,
              rack: r.rack,
              shelf: s.shelf,
              status: s.status,
              totalStock: s.totalStock,
            });
          }
        });
      });
    });

    const rank = { EXPIRED: 3, NEAR_EXPIRY: 2, LOW_STOCK: 1 };
    return list.sort((a, b) => rank[b.status] - rank[a.status]);
  }, [zones]);

  // ==========================================
  // Xử lý Phím Tắt (Keyboard Navigation)
  // ==========================================
  useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu người dùng đang gõ trong ô input hoặc select
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'Escape') {
        if (view.level === 'rack') {
          if (view.bin !== null) {
            dispatch({ type: 'SELECT_SHELF', shelf: view.shelf });
          } else {
            dispatch({ type: 'OVERVIEW' });
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (view.level === 'rack') {
          dispatch({ type: 'STEP_RACK', dir: -1 });
        }
      } else if (e.key === 'ArrowRight') {
        if (view.level === 'rack') {
          dispatch({ type: 'STEP_RACK', dir: 1 });
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        if (view.level === 'rack') {
          const num = Number(e.key);
          dispatch({ type: 'SELECT_SHELF', shelf: view.shelf === num ? null : num });
        }
      } else if (e.key === 'Enter') {
        if (view.level === 'rack' && activeZone && activeRack) {
          if (view.shelf && view.bin) {
            onOpenBinDetail(activeZone, activeRack, view.shelf, view.bin);
          } else if (view.shelf) {
            onOpenShelfDetail(activeZone, activeRack, view.shelf);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardEnabled, view, activeZone, activeRack, dispatch, onOpenBinDetail, onOpenShelfDetail]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 overflow-hidden">
      {/* ========================================================= */}
      {/* 1. THANH ĐỈNH TRÊN (TOP BAR): Breadcrumb & Nút Điều Khiển */}
      {/* ========================================================= */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        {/* Vùng Trên - Trái: Thu gọn tối đa, xóa chữ Khu và chữ Dãy */}
        {!isOverview && activeRack ? (
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => dispatch({ type: 'OVERVIEW' })}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              title="Quay lại tổng quan kho (Phím Esc)"
            >
              <ArrowLeft size={12} />
              <span>Tổng quan</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-xs flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: activeZoneMeta?.hex || '#3b82f6' }}
              />
              {activeRack}
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                if (activeZone && activeRack) {
                  onOpenShelfDetail(activeZone, activeRack, view.shelf || 1);
                }
              }}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs whitespace-nowrap"
              title="Mở chi tiết tầng (Enter)"
            >
              <ExternalLink size={11} />
              <span>Chi tiết T{view.shelf || 1}</span>
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Vùng Trên - Phải: Bộ Lọc Cảnh Báo & Chú Giải (đã xóa nút Xem 2D) */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-sm text-xs">
          {/* Công tắc Chỉ hiện cảnh báo */}
          <button
            type="button"
            onClick={() => setWarnOnly(!warnOnly)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              warnOnly
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Chỉ cảnh báo</span>
          </button>

          {/* Nút bật Chú giải màu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Chú giải mã màu"
            >
              <SlidersHorizontal size={15} />
            </button>

            {showLegend && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-[11px] space-y-2">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex justify-between items-center">
                  <span>Mã màu GSP & FEFO</span>
                  <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                </div>
                {Object.entries(STATUS_COLORS).map(([key, item]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.hex }} />
                      <span className="text-slate-700">{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SIDE PANEL (CHỈ HIỆN KHI NGƯỜI DÙNG CLICK VÀO 1 THÙNG)  */}
      {/* Đã xóa hẳn ô "Thông tin Dãy" cồng kềnh che mất không gian   */}
      {/* ========================================================= */}
      {!isOverview && activeRack && selectedBinItem && (
        <div className="absolute top-16 right-4 w-72 max-h-[calc(100vh-140px)] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-3.5 flex flex-col pointer-events-auto overflow-y-auto">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                    B{selectedBinItem.binNo}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Tầng {view.shelf} · Kệ {activeRack}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-800 mt-1 line-clamp-2">
                  {selectedBinItem.medicineName || 'Ô Thùng Trống'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'SELECT_SHELF', shelf: view.shelf })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Đóng chi tiết thùng"
              >
                <X size={13} />
              </button>
            </div>

            {/* Thông số tồn kho */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn kho:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedBinItem.currentStock} / {selectedBinItem.maxCapacity || 200} {selectedBinItem.unit || 'đv'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (selectedBinItem.currentStock / (selectedBinItem.maxCapacity || 200)) * 100)}%`,
                    backgroundColor: STATUS_COLORS[selectedBinItem.status]?.hex || '#94a3b8',
                  }}
                />
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500">Trạng thái:</span>
                <span
                  className="font-semibold text-[10px] px-1.5 py-0.2 rounded-full"
                  style={{
                    backgroundColor: STATUS_COLORS[selectedBinItem.status]?.badgeBg,
                    color: STATUS_COLORS[selectedBinItem.status]?.badgeText,
                  }}
                >
                  {STATUS_COLORS[selectedBinItem.status]?.label}
                </span>
              </div>
              {selectedBinItem.nearestExpDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạn dùng:</span>
                  <span className="font-semibold text-orange-600 font-mono">
                    {selectedBinItem.nearestExpDate}
                  </span>
                </div>
              )}
            </div>

            {/* Cảnh báo lô cũ ở Khu Dự Trữ */}
            {selectedBinItem.hasReserveBatch && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2 rounded-xl text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <span>Có lô cũ tại Khu Dự Trữ</span>
                </div>
                {onOpenReserve && (
                  <button
                    type="button"
                    onClick={onOpenReserve}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-900 cursor-pointer block"
                  >
                    Mở bảng Khu Dự Trữ →
                  </button>
                )}
              </div>
            )}

            {/* Nút mở Modal Quản lý Lô thuốc */}
            <button
              type="button"
              onClick={() => {
                if (activeZone && activeRack && view.shelf && view.bin) {
                  onOpenBinDetail(activeZone, activeRack, view.shelf, view.bin);
                }
              }}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <ExternalLink size={12} />
              <span>Quản lý lô thuốc (Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ĐIỀU HƯỚNG DƯỚI (BOTTOM BAR): Đã xóa thanh chuyển khu nhanh */}
      {/* ========================================================= */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {/* Vùng Dưới - Trái: Bảng phân khu mini khi ở Overview (nhỏ gọn, không che thanh tìm kiếm) */}
        {isOverview ? (
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-md p-1.5 text-xs">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
              Phân khu kho GSP
            </div>
            <table className="border-collapse">
              <tbody>
                <tr>
                  {['A', 'B', 'C'].map((code) => {
                    const meta = ZONE_METAS[code];
                    return (
                      <td key={code} className="p-0.5">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'OPEN_RACK', rack: `${code}1` })}
                          className="w-[58px] px-1.5 py-1 rounded-lg border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/50 flex items-center gap-1 transition cursor-pointer text-left"
                          title={`${meta.name} - ${meta.categoryDesc}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: meta.hex }}
                          />
                          <span className="font-bold text-slate-700 text-[10px] truncate">
                            Khu {code}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  {['D', 'E', 'F'].map((code) => {
                    const meta = ZONE_METAS[code];
                    return (
                      <td key={code} className="p-0.5">
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'OPEN_RACK', rack: `${code}1` })}
                          className="w-[58px] px-1.5 py-1 rounded-lg border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/50 flex items-center gap-1 transition cursor-pointer text-left"
                          title={`${meta.name} - ${meta.categoryDesc}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: meta.hex }}
                          />
                          <span className="font-bold text-slate-700 text-[10px] truncate">
                            Khu {code}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td colSpan={3} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'OPEN_RACK', rack: 'RES1' })}
                      className="w-full px-1.5 py-1 rounded-lg border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/50 flex items-center justify-center gap-1 transition cursor-pointer"
                      title={`${ZONE_METAS.RESERVE.name} - ${ZONE_METAS.RESERVE.categoryDesc}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ZONE_METAS.RESERVE.hex }}
                      />
                      <span className="font-bold text-slate-700 text-[10px]">
                        {ZONE_METAS.RESERVE.name}
                      </span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div />
        )}

        {/* Vùng Dưới - Phải (Chỉ hiện khi ở Overview): Nút danh sách cảnh báo */}
        {isOverview && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAlertsDrawer(!showAlertsDrawer)}
              className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-md text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition cursor-pointer text-slate-800"
            >
              <AlertTriangle size={15} className="text-amber-500" />
              <span>Cảnh báo</span>
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {warningList.length}
              </span>
            </button>

            {/* Danh sách cảnh báo trượt */}
            {showAlertsDrawer && (
              <div className="absolute right-0 bottom-full mb-2 w-72 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 text-xs space-y-2">
                <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex justify-between items-center">
                  <span>Điểm nóng cần lưu ý ({warningList.length})</span>
                  <button onClick={() => setShowAlertsDrawer(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                </div>

                {warningList.length === 0 ? (
                  <div className="text-slate-400 text-center py-4">Kho không có cảnh báo nào</div>
                ) : (
                  warningList.slice(0, 15).map((w, idx) => {
                    const cfg = STATUS_COLORS[w.status];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'GOTO', rack: w.rack, shelf: w.shelf });
                          setShowAlertsDrawer(false);
                        }}
                        className="w-full p-2 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between text-left transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800 font-mono">
                            {w.rack} · Tầng {w.shelf}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Khu {w.zone} · Tồn: {w.totalStock} đv
                          </div>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
