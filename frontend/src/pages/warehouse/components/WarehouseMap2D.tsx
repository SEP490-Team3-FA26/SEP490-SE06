import React, { useState, useCallback } from "react";
import { Layers, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, Package, Plus, Archive } from "lucide-react";
import { inventoryMapService, ShelfLayout, BinData } from "../../../services/inventory/inventoryMap.service";

interface WarehouseMap2DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
  onBinSelect?: (zone: string, rack: string, shelf: number, bin: number) => void;
  onZoneClick?: (zoneData: any) => void;
  highlightTargets?: Set<string>;
  highlightTarget?: string;
}

const ZONE_CONFIG: Record<string, {
  label: string; bgColor: string; headerBg: string; borderColor: string;
  textColor: string; badgeBg: string; badgeText: string; accentColor: string;
}> = {
  A: { label: "Khu A", bgColor: "#eff6ff", headerBg: "#dbeafe", borderColor: "#93c5fd", textColor: "#1d4ed8", badgeBg: "#bfdbfe", badgeText: "#1e40af", accentColor: "#3b82f6" },
  B: { label: "Khu B", bgColor: "#fffbeb", headerBg: "#fef3c7", borderColor: "#fcd34d", textColor: "#b45309", badgeBg: "#fde68a", badgeText: "#92400e", accentColor: "#f59e0b" },
  C: { label: "Khu C", bgColor: "#fff1f2", headerBg: "#ffe4e6", borderColor: "#fda4af", textColor: "#be123c", badgeBg: "#fecdd3", badgeText: "#9f1239", accentColor: "#f43f5e" },
  D: { label: "Khu D", bgColor: "#f0fdf4", headerBg: "#dcfce7", borderColor: "#86efac", textColor: "#15803d", badgeBg: "#bbf7d0", badgeText: "#166534", accentColor: "#22c55e" },
  E: { label: "Khu E", bgColor: "#faf5ff", headerBg: "#f3e8ff", borderColor: "#d8b4fe", textColor: "#7e22ce", badgeBg: "#e9d5ff", badgeText: "#6b21a8", accentColor: "#a855f7" },
  F: { label: "Khu F", bgColor: "#f8fafc", headerBg: "#f1f5f9", borderColor: "#cbd5e1", textColor: "#475569", badgeBg: "#e2e8f0", badgeText: "#334155", accentColor: "#64748b" },
};

const BIN_STATUS: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  NORMAL:      { bg: "#f0fdf4", border: "#86efac", text: "#15803d", dot: "#22c55e", label: "An toàn" },
  LOW_STOCK:   { bg: "#fefce8", border: "#fde047", text: "#854d0e", dot: "#eab308", label: "Sắp hết" },
  NEAR_EXPIRY: { bg: "#fff7ed", border: "#fdba74", text: "#9a3412", dot: "#f97316", label: "Cận date" },
  EXPIRED:     { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", dot: "#ef4444", label: "Hết hạn" },
  EMPTY:       { bg: "#f8fafc", border: "#e2e8f0", text: "#94a3b8", dot: "#cbd5e1", label: "Trống" },
};

const STATUS_SHELF: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  NORMAL:      { bg: "#dcfce7", border: "#86efac", text: "#15803d", dot: "#22c55e" },
  LOW_STOCK:   { bg: "#fef9c3", border: "#fde047", text: "#a16207", dot: "#eab308" },
  NEAR_EXPIRY: { bg: "#ffedd5", border: "#fdba74", text: "#c2410c", dot: "#f97316" },
  EXPIRED:     { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c", dot: "#ef4444" },
  EMPTY:       { bg: "#f8fafc", border: "#e2e8f0", text: "#94a3b8", dot: "#cbd5e1" },
  OUT_OF_STOCK:{ bg: "#f8fafc", border: "#e2e8f0", text: "#cbd5e1", dot: "#e2e8f0" },
};

function getRackWorstStatus(shelves: any[]) {
  if (shelves.some((s) => s.status === "EXPIRED")) return "EXPIRED";
  if (shelves.some((s) => s.status === "NEAR_EXPIRY")) return "NEAR_EXPIRY";
  if (shelves.some((s) => s.status === "LOW_STOCK")) return "LOW_STOCK";
  if (shelves.every((s) => s.status === "EMPTY" || s.status === "OUT_OF_STOCK")) return "EMPTY";
  return "NORMAL";
}

// ============================================================
// BinCell — Ô Thùng trong sơ đồ
// ============================================================
interface BinCellProps {
  key?: React.Key;
  bin: BinData;
  zone: string;
  rack: string;
  shelf: number;
  isHighlighted: boolean;
  onBinSelect?: (zone: string, rack: string, shelf: number, bin: number) => void;
}

function BinCell({
  bin, zone, rack, shelf, isHighlighted, onBinSelect,
}: BinCellProps) {
  const s = BIN_STATUS[bin.status] || BIN_STATUS.EMPTY;
  const isEmpty = bin.status === "EMPTY";

  return (
    <button
      id={`bin-${zone}-${rack}-${shelf}-${bin.binNo}`}
      onClick={() => onBinSelect && onBinSelect(zone, rack, shelf, bin.binNo)}
      className={`relative flex flex-col items-start justify-between rounded-lg p-1.5 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${isHighlighted ? "ring-2 ring-sky-400 ring-offset-1" : ""}`}
      style={{
        backgroundColor: isHighlighted ? "#e0f2fe" : s.bg,
        border: `1.5px ${isEmpty ? "dashed" : "solid"} ${isHighlighted ? "#38bdf8" : s.border}`,
        color: isHighlighted ? "#0284c7" : s.text,
        width: "100%",
        minHeight: 56,
      }}
      title={isEmpty ? `Thùng ${bin.binNo} — Trống (Click để gán thuốc)` : `${bin.medicineName} · ${bin.currentStock} ${bin.unit || ""} · ${s.label}`}
    >
      {/* Số thứ tự Thùng */}
      <div className="text-[9px] font-bold opacity-50 leading-none">B{bin.binNo}</div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center w-full flex-1 gap-0.5 py-1">
          <Plus size={12} className="opacity-30" />
          <span className="text-[9px] opacity-40">Trống</span>
        </div>
      ) : (
        <>
          {/* Tên thuốc */}
          <div className="text-[10px] font-semibold leading-tight line-clamp-2 mt-0.5 w-full">
            {bin.medicineName?.split(" ").slice(0, 3).join(" ")}
          </div>
          {/* Tồn kho */}
          <div className="flex items-center justify-between w-full mt-1">
            <span className="text-[10px] font-mono font-bold">
              {bin.currentStock?.toLocaleString("vi-VN")}
              <span className="font-normal text-[8px] ml-0.5">{bin.unit}</span>
            </span>
            {/* Chấm trạng thái + Ký hiệu hàng Dự Trữ */}
            <div className="flex items-center gap-0.5">
              {bin.hasReserveBatch && (
                <span title="Có lô cũ ở Khu Dự Trữ">
                  <Archive size={9} className="text-amber-500" />
                </span>
              )}
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.dot }} />
            </div>
          </div>
        </>
      )}

      {/* Hiệu ứng nhấp nháy làm sáng */}
      {isHighlighted && (
        <span className="absolute inset-0 rounded-lg animate-ping opacity-20 bg-sky-400 pointer-events-none" />
      )}
    </button>
  );
}

// ============================================================
// RackBinGrid — Kệ với 4 Tầng × 10 Thùng
// ============================================================
function RackBinGrid({
  zone, rack, highlightTargets, highlightTarget, onBinSelect,
}: {
  zone: string; rack: string; highlightTargets?: Set<string>; highlightTarget?: string;
  onBinSelect?: (zone: string, rack: string, shelf: number, bin: number) => void;
}) {
  const [layout, setLayout] = useState<ShelfLayout[] | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    inventoryMapService.getShelfLayout(zone, rack)
      .then(data => {
        const list = Array.isArray(data) ? data : ((data as any)?.data || []);
        setLayout(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.error(`[RackBinGrid] Lỗi tải layout ${zone}-${rack}:`, err);
        setLayout([]);
      })
      .finally(() => setLoading(false));
  }, [zone, rack]);

  if (loading) {
    return (
      <div className="mt-2 py-4 flex justify-center text-xs text-slate-400 gap-2">
        <span className="animate-spin rounded-full w-3 h-3 border-2 border-slate-300 border-t-blue-500" />
        Đang tải sơ đồ kệ...
      </div>
    );
  }

  if (!layout || layout.length === 0) {
    return (
      <div className="mt-2 py-3 text-center text-xs text-slate-400">
        Chưa có dữ liệu phân bổ thùng cho kệ này.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {layout.map(shelfData => (
        <div key={shelfData.shelfNo} className="bg-white/80 rounded-lg border border-slate-200 overflow-hidden">
          {/* Tiêu đề Tầng Kệ */}
          <div className="px-2 py-1 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
            <Layers size={10} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tầng {shelfData.shelfNo}
            </span>
            <span className="text-[9px] text-slate-400 ml-1">
              ({shelfData.bins.filter(b => b.status !== "EMPTY").length}/10 thùng có hàng)
            </span>
          </div>
          {/* Lưới 10 Ô Thùng */}
          <div className="grid gap-1 p-1.5" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {shelfData.bins.map(bin => {
              const highlightId = `bin-${zone}-${rack}-${shelfData.shelfNo}-${bin.binNo}`;
              const shelfTargetId = `${zone}-${rack}-${shelfData.shelfNo}`;
              const isHighlighted =
                (highlightTargets?.has(highlightId) ?? false) ||
                (highlightTargets?.has(shelfTargetId) ?? false) ||
                highlightTarget === highlightId ||
                highlightTarget === shelfTargetId;

              return (
                <BinCell
                  key={bin.binNo}
                  bin={bin}
                  zone={zone}
                  rack={rack}
                  shelf={shelfData.shelfNo}
                  isHighlighted={isHighlighted}
                  onBinSelect={onBinSelect}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main WarehouseMap2D Component
// ============================================================
export function WarehouseMap2D({
  zones,
  onShelfSelect,
  onBinSelect,
  onZoneClick,
  highlightTargets,
  highlightTarget,
}: WarehouseMap2DProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  // Theo dõi kệ nào đang được mở rộng (hiển thị lưới thùng)
  const [expandedRack, setExpandedRack] = useState<string | null>(null);

  const handleRackToggle = useCallback((rackKey: string) => {
    setExpandedRack(prev => prev === rackKey ? null : rackKey);
  }, []);

  React.useEffect(() => {
    let targetId: string | null = null;
    if (highlightTarget) {
      targetId = highlightTarget;
    } else if (highlightTargets && highlightTargets.size > 0) {
      targetId = highlightTargets.values().next().value || null;
    }

    if (targetId) {
      // Highlight có thể là bin hoặc shelf
      const element = document.getElementById(targetId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightTarget, highlightTargets]);

  return (
    <div className="flex-1 h-full overflow-auto p-5 flex flex-col bg-slate-100">
      <style>{`
        .zone-card { transition: all 0.2s ease; }
        .zone-card:hover { transform: translateY(-2px); }
        .shelf-btn { transition: all 0.15s ease; }
        .shelf-btn:hover { filter: brightness(0.93); transform: translateY(-1px); }
        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(14,165,233,0); }
        }
        .highlighted-shelf { animation: highlightPulse 1.5s ease-in-out infinite; }
        @keyframes binPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,0.6); }
          50% { box-shadow: 0 0 0 4px rgba(56,189,248,0); }
        }
        .highlighted-bin { animation: binPulse 1.2s ease-in-out infinite; }
      `}</style>

      {/* Khu vực tiếp nhận hàng nhập */}
      <div className="w-full mb-4 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shrink-0 bg-emerald-50 border border-dashed border-emerald-300">
        <span className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          🚚 CỬA NHẬP HÀNG (Inbound Docks) — Khu Tiếp Nhận & Kiểm Đếm
        </span>
        <span className="font-mono text-[10px] text-emerald-500">Luồng một chiều → GSP</span>
      </div>

      {/* Lưới các khu vực (Zone) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
        {zones.map((zoneData) => {
          const cfg = ZONE_CONFIG[zoneData.zone] || ZONE_CONFIG.F;
          const totalStock = zoneData.racks.reduce((a: number, r: any) =>
            a + r.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0);
          const alertShelves = zoneData.racks.reduce((a: number, r: any) =>
            a + r.shelves.filter((sh: any) => ["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(sh.status)).length, 0);
          const isHovered = hoveredZone === zoneData.zone;

          return (
            <div
              key={zoneData.zone}
              className="zone-card rounded-2xl overflow-hidden flex flex-col cursor-pointer"
              style={{
                backgroundColor: cfg.bgColor,
                border: `2px solid ${isHovered ? cfg.accentColor : cfg.borderColor}`,
                boxShadow: isHovered
                  ? `0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px ${cfg.accentColor}40`
                  : "0 2px 8px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={() => setHoveredZone(zoneData.zone)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => onZoneClick && onZoneClick(zoneData)}
            >
              {/* Tiêu đề Khu Vực */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: cfg.headerBg, borderBottom: `1px solid ${cfg.borderColor}` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs"
                    style={{ backgroundColor: cfg.badgeBg, color: cfg.textColor }}
                  >
                    {zoneData.zone}
                  </div>
                  <div>
                    <div className="text-xs font-bold tracking-wide" style={{ color: cfg.textColor }}>
                      Khu {zoneData.zone}
                    </div>
                    <div className="text-[10px] mt-0.5 text-slate-500">
                      {zoneData.racks?.length || 0} dãy kệ &middot; {zoneData.racks?.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-xs font-bold font-mono px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}
                  >
                    {totalStock.toLocaleString("vi-VN")}
                  </span>
                  {alertShelves > 0 && (
                    <span className="text-[10px] flex items-center gap-1 text-amber-600 font-medium">
                      <AlertTriangle size={9} /> {alertShelves} cảnh báo
                    </span>
                  )}
                </div>
              </div>

              {/* Danh sách Kệ */}
              <div className="p-3 grid gap-2.5 flex-1" onClick={(e) => e.stopPropagation()}>
                {zoneData.racks.map((rackData: any) => {
                  const rackStatus = getRackWorstStatus(rackData.shelves);
                  const rackStyle = STATUS_SHELF[rackStatus] || STATUS_SHELF.EMPTY;
                  const rackKey = `${zoneData.zone}-${rackData.rack}`;
                  const isExpanded = expandedRack === rackKey;

                  return (
                    <div
                      key={rackData.rack}
                      className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* Tiêu đề Kệ — bấm để mở/đóng Lưới Ô Thùng */}
                      <div
                        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => handleRackToggle(rackKey)}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Layers size={11} className="text-slate-400" />
                          Kệ {rackData.rack}
                          <span className="font-mono text-[10px] text-slate-400">
                            · {rackData.shelves.reduce((a: number, s: any) => a + s.batchCount, 0)} lô
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: rackStyle.dot }}
                            title={`Trạng thái: ${rackStatus}`}
                          />
                          {isExpanded
                            ? <ChevronDown size={13} className="text-slate-400" />
                            : <ChevronRight size={13} className="text-slate-400" />
                          }
                        </div>
                      </div>

                      {/* Tóm tắt tầng gọn gàng (hiển thị khi thu gọn) */}
                      {!isExpanded && (
                        <div className="flex flex-col-reverse gap-1 px-2.5 pb-2.5">
                          {rackData.shelves.map((shelfData: any) => {
                            const ss = STATUS_SHELF[shelfData.status] || STATUS_SHELF.EMPTY;
                            const targetId = `${zoneData.zone}-${rackData.rack}-${shelfData.shelf}`;
                            const isHighlighted = (highlightTargets?.has(targetId) ?? false) || highlightTarget === targetId;

                            return (
                              <button
                                key={shelfData.shelf}
                                id={targetId}
                                onClick={() => onShelfSelect(zoneData.zone, rackData.rack, shelfData.shelf)}
                                className={`shelf-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${isHighlighted ? "highlighted-shelf" : ""}`}
                                style={{
                                  backgroundColor: isHighlighted ? "#e0f2fe" : ss.bg,
                                  border: `1px solid ${isHighlighted ? "#38bdf8" : ss.border}`,
                                  color: isHighlighted ? "#0284c7" : ss.text,
                                }}
                                title={`Tầng ${shelfData.shelf} · Tồn: ${shelfData.totalStock} · ${shelfData.status}`}
                              >
                                <span>T{shelfData.shelf}</span>
                                <span className="flex items-center gap-1 tabular-nums">
                                  {shelfData.totalStock.toLocaleString("vi-VN")}
                                  {shelfData.status === "EXPIRED" && <AlertTriangle size={9} />}
                                  {shelfData.status === "NEAR_EXPIRY" && <Clock size={9} />}
                                  {shelfData.status === "NORMAL" && <CheckCircle size={9} />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Mở rộng: Lưới 4 Tầng × 10 Thùng */}
                      {isExpanded && (
                        <div className="px-2 pb-2">
                          <RackBinGrid
                            zone={zoneData.zone}
                            rack={rackData.rack}
                            highlightTargets={highlightTargets}
                            highlightTarget={highlightTarget}
                            onBinSelect={onBinSelect}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chân thẻ Khu Vực */}
              <div
                className="px-4 py-1.5 flex items-center justify-between text-[10px]"
                style={{ borderTop: `1px solid ${cfg.borderColor}`, backgroundColor: cfg.headerBg, color: "#94a3b8" }}
              >
                <span>{zoneData.racks.length} kệ · {zoneData.racks.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng</span>
                <span style={{ color: isHovered ? cfg.accentColor : undefined, transition: "color 0.2s", fontWeight: isHovered ? 600 : 400 }}>
                  Click kệ để xem 10 thùng →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Khu vực xuất hàng */}
      <div className="w-full mt-4 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shrink-0 bg-sky-50 border border-dashed border-sky-300">
        <span className="flex items-center gap-2 font-semibold text-sky-700">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse inline-block" />
          🚛 CỬA XUẤT HÀNG (Outbound Docks) — Khu Soạn Đơn & Đóng Gói
        </span>
        <span className="font-mono text-[10px] text-sky-400">FEFO / FIFO — WMS</span>
      </div>
    </div>
  );
}
