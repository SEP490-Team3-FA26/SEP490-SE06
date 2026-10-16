import React, { useState, useMemo } from 'react';
import {
  Boxes,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Home,
  Zap,
  Activity,
  Layers,
  Archive,
  AlertTriangle,
  Clock,
  CheckCircle,
  ExternalLink,
  MapPin,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react';
import {
  ZoneSummary,
  ZONE_METAS,
  STATUS_COLORS,
  WarehouseStatus,
} from './constants';
import { SelectedEntity, HoveredEntity } from './useWarehouse3DState';

interface WarehouseHudOverlayProps {
  zones: ZoneSummary[];
  selectedEntity: SelectedEntity | null;
  hoveredEntity: HoveredEntity | null;
  fefoXrayMode: boolean;
  highlightTarget?: string;
  onSelectZone: (zone: string) => void;
  onSelectRack: (zone: string, rack: string) => void;
  onSelectShelf: (zone: string, rack: string, shelf: number) => void;
  onSelectBin: (zone: string, rack: string, shelf: number, bin: number, data?: any) => void;
  onToggleFefoXray: () => void;
  onResetCamera: () => void;
  onRotateCamera: (delta: number) => void;
  onZoomCamera: (factor: number) => void;
  onShelfSelectModal?: (zone: string, rack: string, shelf: number) => void;
  onBinSelectModal?: (zone: string, rack: string, shelf: number, bin: number) => void;
  onSwitchTo2D?: () => void;
}

export function WarehouseHudOverlay({
  zones,
  selectedEntity,
  hoveredEntity,
  fefoXrayMode,
  highlightTarget,
  onSelectZone,
  onSelectRack,
  onSelectShelf,
  onSelectBin,
  onToggleFefoXray,
  onResetCamera,
  onRotateCamera,
  onZoomCamera,
  onShelfSelectModal,
  onBinSelectModal,
  onSwitchTo2D,
}: WarehouseHudOverlayProps) {
  const [activeBoardTab, setActiveBoardTab] = useState<'zones' | 'alerts' | 'docks'>('zones');

  // Tính toán KPI tổng quan
  const stats = useMemo(() => {
    let totalStock = 0;
    let totalBatches = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;
    let lowStockCount = 0;
    let reserveStock = 0;
    let activeBinsCount = 0;

    zones.forEach((z) => {
      z.racks.forEach((r) => {
        r.shelves.forEach((s) => {
          totalStock += s.totalStock || 0;
          totalBatches += s.batchCount || 0;
          if (s.status === 'EXPIRED') expiredCount++;
          if (s.status === 'NEAR_EXPIRY') nearExpiryCount++;
          if (s.status === 'LOW_STOCK') lowStockCount++;
          if (s.status !== 'EMPTY') activeBinsCount += 10;
          if (z.zone === 'RESERVE') reserveStock += s.totalStock || 0;
        });
      });
    });

    const occupancyRate = Math.min(100, Math.round((activeBinsCount / 1120) * 100));

    return {
      totalStock,
      totalBatches,
      expiredCount,
      nearExpiryCount,
      lowStockCount,
      reserveStock,
      occupancyRate,
    };
  }, [zones]);

  // Danh sách các cảnh báo FEFO
  const fefoAlerts = useMemo(() => {
    const list: Array<{
      zone: string;
      rack: string;
      shelf: number;
      status: WarehouseStatus;
      stock: number;
      batches: number;
    }> = [];

    zones.forEach((z) => {
      z.racks.forEach((r) => {
        r.shelves.forEach((s) => {
          if (s.status === 'EXPIRED' || s.status === 'NEAR_EXPIRY' || s.status === 'LOW_STOCK') {
            list.push({
              zone: z.zone,
              rack: r.rack,
              shelf: s.shelf,
              status: s.status,
              stock: s.totalStock,
              batches: s.batchCount,
            });
          }
        });
      });
    });

    // Ưu tiên EXPIRED lên trước, sau đó tới NEAR_EXPIRY
    const rank: Record<string, number> = { EXPIRED: 1, NEAR_EXPIRY: 2, LOW_STOCK: 3 };
    return list.sort((a, b) => (rank[a.status] || 99) - (rank[b.status] || 99));
  }, [zones]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 overflow-hidden z-10 select-none">
      {/* ============================================================== */}
      {/* 1. TOP HUD BAR: LOGO · QUICK SWITCHER · TELEMETRY · 2D/3D       */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between w-full gap-3 pointer-events-auto">
        {/* Nhận diện Kho Trung Tâm */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Boxes size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              CENTRAL_WH
              <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Digital Twin
              </span>
            </div>
            <div className="text-[10px] text-slate-500">Chuẩn GSP & FEFO · 1.120 Thùng</div>
          </div>
        </div>

        {/* Quick Zone Switcher (Các pill nhảy nhanh tới từng khu) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
          <button
            type="button"
            onClick={onResetCamera}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Toàn cảnh
          </button>
          {['A', 'B', 'C', 'D', 'E', 'F'].map((zk) => {
            const meta = ZONE_METAS[zk];
            const isCur = selectedEntity?.zone === zk;
            return (
              <button
                key={zk}
                type="button"
                onClick={() => onSelectZone(zk)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isCur ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.hex }} />
                {zk}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectZone('RESERVE')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedEntity?.zone === 'RESERVE'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            RESERVE (FEFO)
          </button>
        </div>

        {/* Telemetry Live + Nút chuyển chế độ 2D / 3D */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50/90 backdrop-blur-md border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Activity size={13} className="text-emerald-600" />
            <span>21.4°C · 52% RH</span>
          </div>

          {onSwitchTo2D && (
            <button
              type="button"
              onClick={onSwitchTo2D}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold shadow-sm transition cursor-pointer"
              title="Chuyển sang Mặt bằng 2D"
            >
              <Layers size={14} className="text-blue-600" />
              <span>Xem 2D</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BODY CHÍNH: KPI GÓC TRÁI · CAM CONTROLS · INSPECTOR GÓC PHẢI */}
      {/* ============================================================== */}
      <div className="flex-1 flex justify-between items-start gap-4 my-3 overflow-hidden">
        {/* KPI Ribbon (3 Thẻ kính mờ trên-trái) */}
        <div className="flex flex-col gap-2 w-64 pointer-events-auto">
          {/* Thẻ 1: Tổng tồn kho */}
          <div className="p-3.5 rounded-2xl bg-white/88 backdrop-blur-md border border-slate-200/80 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Tồn Kho GSP</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {stats.totalStock.toLocaleString('vi-VN')}
              <span className="text-xs font-normal text-slate-500 ml-1">đơn vị</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{stats.totalBatches} lô hàng</span>
              <span className="font-semibold text-blue-600">{stats.occupancyRate}% lấp đầy</span>
            </div>
          </div>

          {/* Thẻ 2: Rủi ro Hạn dùng FEFO */}
          <div
            onClick={onToggleFefoXray}
            className={`p-3.5 rounded-2xl backdrop-blur-md border shadow-sm cursor-pointer transition ${
              fefoXrayMode
                ? 'bg-amber-500/90 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                : 'bg-white/88 text-slate-800 border-slate-200/80 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${fefoXrayMode ? 'text-amber-100' : 'text-slate-400'}`}>
                Giám Sát Hạn Dùng FEFO
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${fefoXrayMode ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                X-Ray
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                <AlertTriangle size={13} className={fefoXrayMode ? 'text-white' : 'text-rose-600'} />
                <span className={fefoXrayMode ? 'text-white' : 'text-rose-700'}>{stats.expiredCount} Hết hạn</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                <Clock size={13} className={fefoXrayMode ? 'text-white' : 'text-amber-600'} />
                <span className={fefoXrayMode ? 'text-white' : 'text-amber-700'}>{stats.nearExpiryCount} Cận date</span>
              </div>
            </div>
          </div>

          {/* Thẻ 3: Khu Kệ Dự Trữ RESERVE */}
          <div
            onClick={() => onSelectZone('RESERVE')}
            className="p-3.5 rounded-2xl bg-amber-50/90 backdrop-blur-md border border-amber-200/80 shadow-sm cursor-pointer hover:bg-amber-100/90 transition"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              <span>Khu Dự Trữ FEFO</span>
              <Archive size={13} className="text-amber-600" />
            </div>
            <div className="text-base font-bold font-mono text-amber-950 mt-1">
              {stats.reserveStock.toLocaleString('vi-VN')}
              <span className="text-xs font-normal text-amber-800 ml-1">đv tồn đệm</span>
            </div>
            <div className="text-[10px] text-amber-700/80 mt-1">4 kệ RES1..RES4 · Sức chứa 160 thùng</div>
          </div>
        </div>

        {/* Tactical Inspector (Bảng Chi Tiết Đối Tượng Góc Phải) */}
        <div className="flex items-start gap-2.5 pointer-events-auto max-h-[580px]">
          {/* Cột 6 Nút Điều Khiển Camera Chiến Thuật */}
          <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm">
            <button
              type="button"
              onClick={() => onZoomCamera(0.85)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
              title="Phóng to (+)"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => onZoomCamera(1.15)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
              title="Thu nhỏ (-)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={() => onRotateCamera(Math.PI / 4)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
              title="Xoay trái 45°"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={() => onRotateCamera(-Math.PI / 4)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
              title="Xoay phải 45°"
            >
              <RotateCw size={15} />
            </button>
            <button
              type="button"
              onClick={onResetCamera}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
              title="Góc nhìn toàn cảnh mặc định (Home)"
            >
              <Home size={15} />
            </button>
            <div className="w-full h-px bg-slate-200 my-0.5" />
            <button
              type="button"
              onClick={onToggleFefoXray}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition cursor-pointer ${
                fefoXrayMode
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
              title="Bật/Tắt chế độ X-Ray FEFO"
            >
              <Zap size={15} />
            </button>
          </div>

          {/* Nội dung Inspector */}
          <div className="w-80 rounded-2xl bg-white/92 backdrop-blur-md border border-slate-200/90 shadow-lg p-4 flex flex-col gap-3 overflow-y-auto max-h-[560px]">
            {/* TH 1: Đang chọn Ô Thùng (Bin) */}
            {selectedEntity?.type === 'bin' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    STORAGE BIN · THÙNG B{selectedEntity.bin}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                    T{selectedEntity.shelf} · {selectedEntity.rack}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedEntity.data?.medicineName || 'Ô Thùng Trống'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Khu {selectedEntity.zone} · Kệ {selectedEntity.rack} · Tầng {selectedEntity.shelf}
                  </p>
                </div>

                {/* Thanh tiến độ dung tích */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Tồn kho:</span>
                    <span className="font-mono text-blue-600">
                      {(selectedEntity.data?.currentStock || 0).toLocaleString('vi-VN')} / {selectedEntity.data?.maxCapacity || 200} {selectedEntity.data?.unit || 'Hộp'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((selectedEntity.data?.currentStock || 0) / (selectedEntity.data?.maxCapacity || 200)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Cảnh báo lô cũ ở Khu Dự Trữ */}
                {selectedEntity.data?.hasReserveBatch && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
                    <Archive size={15} className="text-amber-600 shrink-0" />
                    <span>Thuốc này có lô cũ tại Khu Dự Trữ cần ưu tiên xuất trước!</span>
                  </div>
                )}

                {/* CTA mở Modal chi tiết thùng */}
                {onBinSelectModal && (
                  <button
                    type="button"
                    onClick={() =>
                      onBinSelectModal(
                        selectedEntity.zone,
                        selectedEntity.rack!,
                        selectedEntity.shelf!,
                        selectedEntity.bin!
                      )
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Quản Lý Lô Thuốc (Modal)</span>
                  </button>
                )}
              </>
            )}

            {/* TH 2: Đang chọn Tầng Kệ (Shelf) */}
            {selectedEntity?.type === 'shelf' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    SHELF LEVEL · TẦNG {selectedEntity.shelf}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                    Kệ {selectedEntity.rack}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Kệ {selectedEntity.rack} — Tầng {selectedEntity.shelf}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Khu {selectedEntity.zone} ({ZONE_METAS[selectedEntity.zone]?.name})
                  </p>
                </div>
                {onShelfSelectModal && (
                  <button
                    type="button"
                    onClick={() =>
                      onShelfSelectModal(
                        selectedEntity.zone,
                        selectedEntity.rack!,
                        selectedEntity.shelf!
                      )
                    }
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Mở Chi Tiết Tầng (Modal)</span>
                  </button>
                )}
              </>
            )}

            {/* TH 3: Đang chọn Dãy Kệ (Rack) */}
            {selectedEntity?.type === 'rack' && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    RACK UNIT · KỆ {selectedEntity.rack}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">
                    Khu {selectedEntity.zone}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Dãy Kệ {selectedEntity.rack}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Gồm 4 tầng · Sức chứa tối đa 40 ô thùng
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[4, 3, 2, 1].map((sNo) => (
                    <button
                      key={sNo}
                      type="button"
                      onClick={() => onSelectShelf(selectedEntity.zone, selectedEntity.rack!, sNo)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-left transition cursor-pointer"
                    >
                      <div className="text-[10px] text-slate-400 font-bold">TẦNG {sNo}</div>
                      <div className="text-xs font-semibold text-slate-700 flex items-center justify-between mt-0.5">
                        <span>Chi tiết</span>
                        <ChevronRight size={12} className="text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* TH 4: Mặc định / Đang chọn Phân Khu (Zone) */}
            {(!selectedEntity || selectedEntity.type === 'zone') && (
              <>
                {(() => {
                  const currentZoneKey = selectedEntity?.zone || 'A';
                  const meta = ZONE_METAS[currentZoneKey] || ZONE_METAS.A;
                  const zData = zones.find((z) => z.zone === currentZoneKey);
                  const totalZStock = zData?.racks.reduce(
                    (acc, r) => acc + r.shelves.reduce((s, sh) => s + (sh.totalStock || 0), 0),
                    0
                  ) || 0;

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.hex }}>
                          GSP PHARMACOLOGICAL ZONE
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                          {zData?.racks.length || 4} dãy kệ
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{meta.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{meta.categoryDesc}</p>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng tồn khu vực</div>
                        <div className="text-lg font-bold font-mono text-slate-800 mt-0.5">
                          {totalZStock.toLocaleString('vi-VN')}
                          <span className="text-xs font-normal text-slate-500 ml-1">đơn vị</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">Danh sách dãy kệ:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {meta.racks.map((rk) => (
                          <button
                            key={rk}
                            type="button"
                            onClick={() => onSelectRack(currentZoneKey, rk)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left transition cursor-pointer"
                          >
                            <div className="text-xs font-bold text-slate-800">Kệ {rk}</div>
                            <div className="text-[10px] text-slate-400">4 Tầng · 40 Thùng</div>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM HUD BAR: FEFO STEPPER & WAYFINDING · ALERT BOARD     */}
      {/* ============================================================== */}
      <div className="flex items-end justify-between w-full gap-4 pointer-events-auto">
        {/* Nửa Trái: Chu trình FEFO 5 Bước & Thẻ Wayfinding */}
        <div className="flex flex-col gap-2 flex-1 max-w-2xl">
          {/* Thẻ Wayfinding nếu đang tìm kiếm */}
          {highlightTarget && (
            <div className="px-4 py-2.5 rounded-2xl bg-sky-500 text-white shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-white animate-bounce" />
                <span>Đang định vị: <b>{highlightTarget}</b></span>
              </div>
              <span className="text-[11px] bg-sky-600 px-2.5 py-1 rounded-lg">Đường dẫn sáng dưới sàn</span>
            </div>
          )}

          {/* Chu trình FEFO 5 Bước */}
          <div className="px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-sm flex items-center justify-between gap-2 text-xs">
            {[
              { num: '1', title: 'Nhập Kho', desc: 'Inbound' },
              { num: '2', title: 'Kệ Chính', desc: 'Zone A-F' },
              { num: '3', title: 'Đẩy Reserve', desc: 'FEFO Risk' },
              { num: '4', title: 'Soạn Đơn', desc: 'Picking' },
              { num: '5', title: 'Xuất Kho', desc: 'Outbound' },
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                    {step.num}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{step.title}</div>
                    <div className="text-[9px] text-slate-400">{step.desc}</div>
                  </div>
                </div>
                {idx < 4 && <div className="w-6 h-px bg-slate-200" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Nửa Phải: Zone & Alert Board (3 Tab) */}
        <div className="w-96 rounded-2xl bg-white/92 backdrop-blur-md border border-slate-200/90 shadow-lg p-3">
          {/* Header 3 Tab */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold mb-2">
            <button
              type="button"
              onClick={() => setActiveBoardTab('zones')}
              className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                activeBoardTab === 'zones' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Phân Khu (7)
            </button>
            <button
              type="button"
              onClick={() => setActiveBoardTab('alerts')}
              className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                activeBoardTab === 'alerts' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Cảnh Báo FEFO</span>
              {fefoAlerts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center">
                  {fefoAlerts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveBoardTab('docks')}
              className={`flex-1 py-1 rounded-lg transition cursor-pointer text-center ${
                activeBoardTab === 'docks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cửa Kho
            </button>
          </div>

          {/* Nội dung Tab */}
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs">
            {activeBoardTab === 'zones' &&
              zones.map((z) => {
                const meta = ZONE_METAS[z.zone] || ZONE_METAS.F;
                const totalZStock = z.racks.reduce(
                  (acc, r) => acc + r.shelves.reduce((s, sh) => s + (sh.totalStock || 0), 0),
                  0
                );
                return (
                  <div
                    key={z.zone}
                    onClick={() => onSelectZone(z.zone)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.hex }} />
                      <span className="font-bold text-slate-800">{meta.name}</span>
                      <span className="text-[10px] text-slate-400">· {z.racks.length} kệ</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {totalZStock.toLocaleString('vi-VN')} đv
                    </span>
                  </div>
                );
              })}

            {activeBoardTab === 'alerts' && (
              <>
                {fefoAlerts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Tất cả các kệ đang ở trạng thái an toàn
                  </div>
                ) : (
                  fefoAlerts.slice(0, 15).map((alert, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectShelf(alert.zone, alert.rack, alert.shelf)}
                      className="flex items-center justify-between p-1.5 rounded-xl hover:bg-amber-50 cursor-pointer transition border border-transparent hover:border-amber-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[alert.status]?.hex || '#ef4444' }}
                        />
                        <span className="font-bold text-slate-800">
                          {alert.rack} · T{alert.shelf}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({alert.batches} lô · {alert.stock} đv)
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: STATUS_COLORS[alert.status]?.badgeBg,
                          color: STATUS_COLORS[alert.status]?.badgeText,
                        }}
                      >
                        {STATUS_COLORS[alert.status]?.label}
                      </span>
                    </div>
                  ))
                )}
              </>
            )}

            {activeBoardTab === 'docks' && (
              <div className="space-y-2 py-1">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-emerald-600" />
                    <div>
                      <div className="font-bold text-emerald-900 text-xs">Cửa Nhập (Inbound Docks)</div>
                      <div className="text-[10px] text-emerald-700">3 khoang đỗ xe · Tây Bắc</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    Sẵn sàng
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-sky-600" />
                    <div>
                      <div className="font-bold text-sky-900 text-xs">Cửa Xuất (Outbound Docks)</div>
                      <div className="text-[10px] text-sky-700">Soạn đơn FEFO/FIFO · Đông Nam</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
                    Hoạt động
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. TOOLTIP NỔI THEO TỌA ĐỘ CHUỘT KHI HOVER TRONG 3D           */}
      {/* ============================================================== */}
      {hoveredEntity && hoveredEntity.screenX && hoveredEntity.screenY && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white shadow-xl text-xs flex flex-col gap-0.5"
          style={{
            left: hoveredEntity.screenX + 16,
            top: hoveredEntity.screenY - 45,
          }}
        >
          <div className="font-bold text-sky-300">{hoveredEntity.title}</div>
          {hoveredEntity.subtitle && (
            <div className="text-[10px] text-slate-300">{hoveredEntity.subtitle}</div>
          )}
          {hoveredEntity.stock !== undefined && (
            <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
              Tồn: {hoveredEntity.stock.toLocaleString('vi-VN')} đơn vị
            </div>
          )}
          {hoveredEntity.badge && (
            <div className="text-[9px] text-amber-300 font-medium mt-0.5">
              {hoveredEntity.badge}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
