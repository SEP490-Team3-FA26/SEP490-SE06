import React, { useState, useCallback } from "react";
import { Layers, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, Package, Plus, Archive, TrendingDown } from "lucide-react";
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
  RESERVE: { label: "Khu Dự Trữ", bgColor: "#fffbeb", headerBg: "#fef3c7", borderColor: "#f59e0b", textColor: "#92400e", badgeBg: "#fde68a", badgeText: "#78350f", accentColor: "#d97706" },
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
  if (shelves.some((s) => s.hasExpired || s.status === "NEAR_EXPIRY" || s.hasNearExpiry)) return "NEAR_EXPIRY";
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
        minWidth: 70,
        minHeight: 58,
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
    <div className="mt-2 space-y-1.5">
      {/* Thanh chỉ dẫn kéo ngang để xem trọn vẹn 10 thùng */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-100/90 rounded-md text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1 text-slate-600 font-semibold">
          <span>📦 Lưới 10 Thùng (B1 → B10)</span>
        </span>
        <span className="text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60 font-semibold text-[9px] flex items-center gap-1">
          <span>⇄ Kéo thanh trượt ngang để xem hết</span>
        </span>
      </div>

      {/* Vùng cuộn ngang đồng bộ cả 4 tầng */}
      <div className="overflow-x-auto pb-2 custom-shelf-scrollbar rounded-lg">
        <div className="space-y-2 min-w-[760px]">
          {layout.map(shelfData => (
            <div key={shelfData.shelfNo} className="bg-white/90 rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
              {/* Tiêu đề Tầng Kệ */}
              <div className="px-2.5 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers size={10} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Tầng {shelfData.shelfNo}
                  </span>
                  <span className="text-[9px] text-slate-400 ml-1">
                    ({shelfData.bins.filter(b => b.status !== "EMPTY").length}/10 thùng có hàng)
                  </span>
                </div>
              </div>
              {/* Lưới 10 Ô Thùng */}
              <div className="grid gap-1.5 p-1.5" style={{ gridTemplateColumns: "repeat(10, minmax(70px, 1fr))" }}>
                {shelfData.bins.map(bin => {
                  const highlightId = `bin-${zone}-${rack}-${shelfData.shelfNo}-${bin.binNo}`;
                  const shelfTargetId = `${zone}-${rack}-${shelfData.shelfNo}`;

                  // Kiểm tra xem mục tiêu tìm kiếm có phải là ô thùng cụ thể (dạng bin-Zone-Rack-Shelf-Bin) hay không
                  const hasSpecificBinTarget =
                    Boolean(highlightTarget && highlightTarget.startsWith("bin-")) ||
                    Boolean(highlightTargets && Array.from(highlightTargets).some(t => t.startsWith("bin-")));

                  // Nếu đang tìm kiếm đích danh một ô thùng cụ thể: CHỈ duy nhất ô thùng đó được sáng
                  // Nếu đang lọc theo danh mục hoặc toàn bộ tầng/kệ chung: mới áp dụng theo shelfTargetId
                  const isHighlighted = hasSpecificBinTarget
                    ? (highlightTarget === highlightId || (highlightTargets?.has(highlightId) ?? false))
                    : (highlightTarget === shelfTargetId || (highlightTargets?.has(shelfTargetId) ?? false));

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
      </div>
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
  // Theo dõi mở / đóng danh sách kệ của Khu Dự Trữ (mặc định đóng, bấm nút mới sổ ra)
  const [showReserveRacks, setShowReserveRacks] = useState<boolean>(false);

  const handleRackToggle = useCallback((rackKey: string) => {
    setExpandedRack(prev => prev === rackKey ? null : rackKey);
  }, []);

  // Tự động mở rộng danh sách kệ Khu Dự Trữ nếu có target highlight nằm trong RESERVE
  React.useEffect(() => {
    const hasReserveTarget =
      (highlightTarget && highlightTarget.startsWith("RESERVE")) ||
      (highlightTargets && Array.from(highlightTargets).some(t => t.startsWith("RESERVE")));

    if (hasReserveTarget) {
      setShowReserveRacks(true);
    }
  }, [highlightTarget, highlightTargets]);

  // Tự động mở rộng kệ nếu có mục tiêu tìm kiếm là một ô thùng cụ thể (bin-Zone-Rack-Shelf-Bin)
  React.useEffect(() => {
    const target = highlightTarget || (highlightTargets && Array.from(highlightTargets)[0]);
    if (!target) return;

    if (target.startsWith("bin-")) {
      const parts = target.split("-");
      if (parts.length >= 5) {
        const rack = parts[parts.length - 3];
        const zone = parts.slice(1, parts.length - 3).join("-");
        // Tự động mở rộng kệ chứa ô thùng đó
        setExpandedRack(`${zone}-${rack}`);
      }
    }
  }, [highlightTarget, highlightTargets]);

  // Tự động cuộn tới vị trí tầng kệ hoặc ô thùng được tìm kiếm
  React.useEffect(() => {
    const targetId: string | null = highlightTarget || (highlightTargets?.values().next().value || null);
    if (!targetId) return;

    const tryScroll = () => {
      // 1. Thử tìm phần tử theo ID trực tiếp (nếu là ô thùng hoặc tầng kệ đã render)
      let element = document.getElementById(targetId);

      // 2. Nếu là target dạng bin- mà ô thùng chưa kịp mount, cuộn tới tầng kệ tương ứng
      if (!element && targetId.startsWith("bin-")) {
        const parts = targetId.split("-");
        if (parts.length >= 5) {
          const shelf = parts[parts.length - 2];
          const rack = parts[parts.length - 3];
          const zone = parts.slice(1, parts.length - 3).join("-");
          element = document.getElementById(`${zone}-${rack}-${shelf}`) || document.getElementById(`rack-${zone}-${rack}`);
        }
      }

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };

    tryScroll();
    const timer = setTimeout(tryScroll, 120);
    return () => clearTimeout(timer);
  }, [highlightTarget, highlightTargets]);

  // Phân tách các khu kệ chính A-F và Khu Dự Trữ RESERVE
  const normalZones = zones.filter((z) => z.zone !== "RESERVE");
  const reserveZone = zones.find((z) => z.zone === "RESERVE");

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

        /* Thanh cuộn ngang mượt mà cho 10 thùng của kệ */
        .custom-shelf-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
        .custom-shelf-scrollbar::-webkit-scrollbar {
          height: 7px;
        }
        .custom-shelf-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 9999px;
        }
        .custom-shelf-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 9999px;
          border: 1.5px solid #f1f5f9;
        }
        .custom-shelf-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>

      {/* Khu vực tiếp nhận hàng nhập */}
      <div className="w-full mb-4 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shrink-0 bg-emerald-50 border border-dashed border-emerald-300">
        <span className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          🚚 CỬA NHẬP HÀNG (Inbound Docks) — Khu Tiếp Nhận & Kiểm Đếm
        </span>
        <span className="font-mono text-[10px] text-emerald-500">Luồng một chiều → GSP</span>
      </div>

      {/* Lưới các khu vực Kệ Chính (Zone A - F) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
        {normalZones.map((zoneData) => {
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
                            const binTargetPrefix = `bin-${zoneData.zone}-${rackData.rack}-${shelfData.shelf}-`;

                            const isHighlighted =
                              (highlightTargets?.has(targetId) ?? false) ||
                              highlightTarget === targetId ||
                              (Boolean(highlightTarget) && highlightTarget.startsWith(binTargetPrefix)) ||
                              (Boolean(highlightTargets) && Array.from(highlightTargets).some(t => t.startsWith(binTargetPrefix)));

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
                                title={`Tầng ${shelfData.shelf} · Tổng tồn: ${shelfData.totalStock.toLocaleString("vi-VN")} (${(shelfData.activeStock ?? shelfData.totalStock).toLocaleString("vi-VN")} khả dụng${shelfData.expiredStock ? ` · ${shelfData.expiredStock.toLocaleString("vi-VN")} hết hạn` : ""})`}
                              >
                                <span>T{shelfData.shelf}</span>
                                <span className="flex items-center gap-1.5 tabular-nums">
                                  <span>{shelfData.totalStock.toLocaleString("vi-VN")}</span>
                                  {/* Phương án 1: Badge cảnh báo đỏ nếu có lô thuốc hết hạn cần nhặt ra */}
                                  {shelfData.hasExpired || (shelfData.expiredBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs animate-pulse"
                                      title={`Có ${shelfData.expiredBatchCount || 1} lô hết hạn cần nhặt ra`}
                                    >
                                      <AlertTriangle size={8} />
                                      <span>{shelfData.expiredBatchCount || 1}</span>
                                    </span>
                                  ) : shelfData.hasNearExpiry || (shelfData.nearExpiryBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs"
                                      title={`Có ${shelfData.nearExpiryBatchCount} lô cận date trong 90 ngày`}
                                    >
                                      <Clock size={8} />
                                      <span>{shelfData.nearExpiryBatchCount}</span>
                                    </span>
                                  ) : shelfData.hasLowStock || (shelfData.lowStockBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                      title={`Có ${shelfData.lowStockBatchCount || 1} thuốc sắp hết hàng (< 20 hộp)`}
                                    >
                                      <TrendingDown size={8} />
                                      <span>{shelfData.lowStockBatchCount || 1}</span>
                                    </span>
                                  ) : shelfData.status === "EXPIRED" ? (
                                    <AlertTriangle size={9} className="text-rose-600" />
                                  ) : shelfData.status === "NORMAL" ? (
                                    <CheckCircle size={9} className="text-emerald-600" />
                                  ) : null}
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

      {/* KHỐI KHU DỰ TRỮ (RESERVE ZONE) — CÓ NÚT BẤM SỔ RA CÁC KỆ DỰ TRỮ */}
      {reserveZone && (
        <div className="mt-4 rounded-2xl overflow-hidden bg-amber-50/70 border-2 border-amber-300 shadow-sm transition-all">
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-amber-100/70 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Archive size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Khu Dự Trữ (Reserve Zone) — Kho Đệm FEFO
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    Phân kệ chuẩn
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 mt-0.5">
                  Gồm các dãy Kệ RES1, RES2, RES3, RES4 &middot; {reserveZone.racks?.length || 0} dãy kệ &middot; {reserveZone.racks?.reduce((a: number, r: any) => a + r.shelves.length, 0) || 0} tầng &middot; Sức chứa 160 ô thùng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                {reserveZone.racks?.reduce((a: number, r: any) => a + r.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0).toLocaleString("vi-VN")} đơn vị tồn
              </span>

              {/* NÚT BẤM SỔ RA CÁC KỆ CỦA KHU DỰ TRỮ */}
              <button
                type="button"
                onClick={() => setShowReserveRacks(!showReserveRacks)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs border cursor-pointer ${
                  showReserveRacks
                    ? "bg-amber-600 text-white border-amber-700"
                    : "bg-white hover:bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                <Layers size={14} className={showReserveRacks ? "text-white" : "text-amber-600"} />
                <span>
                  {showReserveRacks
                    ? "🔼 Thu gọn kệ dự trữ"
                    : "📂 Bấm để sổ ra các kệ của Khu Dự Trữ (RES1, RES2, RES3, RES4)"}
                </span>
                {showReserveRacks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>

          {/* Khi bấm nút thì mới sổ ra các kệ của khu dự trữ */}
          {showReserveRacks && (
            <div className="p-4 bg-white/60 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {reserveZone.racks.map((rackData: any) => {
                  const rackStatus = getRackWorstStatus(rackData.shelves);
                  const rackStyle = STATUS_SHELF[rackStatus] || STATUS_SHELF.EMPTY;
                  const rackKey = `RESERVE-${rackData.rack}`;
                  const isExpanded = expandedRack === rackKey;

                  return (
                    <div
                      key={rackData.rack}
                      className="rounded-xl bg-white border border-amber-200 shadow-xs overflow-hidden"
                    >
                      {/* Tiêu đề Kệ Dự Trữ — click để mở/đóng lưới thùng */}
                      <div
                        className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-amber-50/50 transition-colors"
                        onClick={() => handleRackToggle(rackKey)}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Layers size={12} className="text-amber-600" />
                          Kệ Dự Trữ {rackData.rack}
                          <span className="font-mono text-[10px] text-amber-700 font-normal">
                            &middot; {rackData.shelves.reduce((a: number, s: any) => a + s.batchCount, 0)} lô
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs"
                            style={{ backgroundColor: rackStyle.dot }}
                            title={`Trạng thái: ${rackStatus}`}
                          />
                          {isExpanded
                            ? <ChevronDown size={13} className="text-amber-600" />
                            : <ChevronRight size={13} className="text-amber-600" />
                          }
                        </div>
                      </div>

                      {/* Tóm tắt 4 tầng (hiển thị khi thu gọn) */}
                      {!isExpanded && (
                        <div className="flex flex-col-reverse gap-1 px-2.5 pb-2.5">
                          {rackData.shelves.map((shelfData: any) => {
                            const ss = STATUS_SHELF[shelfData.status] || STATUS_SHELF.EMPTY;
                            const targetId = `RESERVE-${rackData.rack}-${shelfData.shelf}`;
                            const binTargetPrefix = `bin-RESERVE-${rackData.rack}-${shelfData.shelf}-`;

                            const isHighlighted =
                              (highlightTargets?.has(targetId) ?? false) ||
                              highlightTarget === targetId ||
                              (Boolean(highlightTarget) && highlightTarget.startsWith(binTargetPrefix)) ||
                              (Boolean(highlightTargets) && Array.from(highlightTargets).some(t => t.startsWith(binTargetPrefix)));

                            return (
                              <button
                                key={shelfData.shelf}
                                id={targetId}
                                onClick={() => onShelfSelect("RESERVE", rackData.rack, shelfData.shelf)}
                                className={`shelf-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${isHighlighted ? "highlighted-shelf" : ""}`}
                                style={{
                                  backgroundColor: isHighlighted ? "#fef3c7" : ss.bg,
                                  border: `1px solid ${isHighlighted ? "#f59e0b" : ss.border}`,
                                  color: isHighlighted ? "#92400e" : ss.text,
                                }}
                                title={`Tầng ${shelfData.shelf} · Tổng tồn: ${shelfData.totalStock.toLocaleString("vi-VN")} (${(shelfData.activeStock ?? shelfData.totalStock).toLocaleString("vi-VN")} khả dụng${shelfData.expiredStock ? ` · ${shelfData.expiredStock.toLocaleString("vi-VN")} hết hạn` : ""})`}
                              >
                                <span>Tầng {shelfData.shelf}</span>
                                <span className="flex items-center gap-1.5 tabular-nums font-mono">
                                  <span>{shelfData.totalStock.toLocaleString("vi-VN")} đv</span>
                                  {shelfData.hasExpired || (shelfData.expiredBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs animate-pulse"
                                      title={`Có ${shelfData.expiredBatchCount || 1} lô hết hạn cần nhặt ra`}
                                    >
                                      <AlertTriangle size={8} />
                                      <span>{shelfData.expiredBatchCount || 1}</span>
                                    </span>
                                  ) : shelfData.hasNearExpiry || (shelfData.nearExpiryBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-xs"
                                      title={`Có ${shelfData.nearExpiryBatchCount} lô cận date trong 90 ngày`}
                                    >
                                      <Clock size={8} />
                                      <span>{shelfData.nearExpiryBatchCount}</span>
                                    </span>
                                  ) : shelfData.hasLowStock || (shelfData.lowStockBatchCount > 0) ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                      title={`Có ${shelfData.lowStockBatchCount || 1} thuốc sắp hết hàng (< 20 hộp)`}
                                    >
                                      <TrendingDown size={8} />
                                      <span>{shelfData.lowStockBatchCount || 1}</span>
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Mở rộng: Lưới 4 Tầng x 10 Thùng của Kệ Dự Trữ */}
                      {isExpanded && (
                        <div className="px-2 pb-2">
                          <RackBinGrid
                            zone="RESERVE"
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
            </div>
          )}
        </div>
      )}

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
