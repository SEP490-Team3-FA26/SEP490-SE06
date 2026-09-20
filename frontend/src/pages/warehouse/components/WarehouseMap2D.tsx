import React, { useState } from "react";
import { Layers, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface WarehouseMap2DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
  onZoneClick?: (zoneData: any) => void;
  highlightTarget?: string;
}

const ZONE_CONFIG: Record<string, {
  label: string;
  bgColor: string;
  headerBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  icon: string;
  description: string;
}> = {
  A: {
    label: "Khu A — Kháng Sinh",
    bgColor: "#eff6ff",
    headerBg: "#dbeafe",
    borderColor: "#93c5fd",
    textColor: "#1d4ed8",
    badgeBg: "#bfdbfe",
    badgeText: "#1e40af",
    accentColor: "#3b82f6",
    icon: "💊",
    description: "Penicillin · Cephalosporin · Macrolide · Quinolone",
  },
  B: {
    label: "Khu B — Hạ Sốt & Giảm Đau",
    bgColor: "#fffbeb",
    headerBg: "#fef3c7",
    borderColor: "#fcd34d",
    textColor: "#b45309",
    badgeBg: "#fde68a",
    badgeText: "#92400e",
    accentColor: "#f59e0b",
    icon: "🌡️",
    description: "Paracetamol · Ibuprofen · Diclofenac · Aspirin",
  },
  C: {
    label: "Khu C — Tim Mạch",
    bgColor: "#fff1f2",
    headerBg: "#ffe4e6",
    borderColor: "#fda4af",
    textColor: "#be123c",
    badgeBg: "#fecdd3",
    badgeText: "#9f1239",
    accentColor: "#f43f5e",
    icon: "❤️",
    description: "Amlodipine · Metoprolol · Atorvastatin · Warfarin",
  },
  D: {
    label: "Khu D — Tiêu Hóa",
    bgColor: "#f0fdf4",
    headerBg: "#dcfce7",
    borderColor: "#86efac",
    textColor: "#15803d",
    badgeBg: "#bbf7d0",
    badgeText: "#166534",
    accentColor: "#22c55e",
    icon: "🫁",
    description: "Omeprazole · Metoclopramide · Smecta · Loperamide",
  },
  E: {
    label: "Khu E — TPCN",
    bgColor: "#faf5ff",
    headerBg: "#f3e8ff",
    borderColor: "#d8b4fe",
    textColor: "#7e22ce",
    badgeBg: "#e9d5ff",
    badgeText: "#6b21a8",
    accentColor: "#a855f7",
    icon: "🌿",
    description: "Vitamin · Khoáng chất · Omega-3 · Collagen",
  },
  F: {
    label: "Khu F — Vật Tư Y Tế",
    bgColor: "#f8fafc",
    headerBg: "#f1f5f9",
    borderColor: "#cbd5e1",
    textColor: "#475569",
    badgeBg: "#e2e8f0",
    badgeText: "#334155",
    accentColor: "#64748b",
    icon: "🩺",
    description: "Băng · Gạc · Kim tiêm · Bơm tiêm · Dụng cụ y tế",
  },
};

const STATUS_SHELF: Record<string, {
  bg: string; border: string; text: string; dot: string;
}> = {
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

export function WarehouseMap2D({ zones, onShelfSelect, onZoneClick, highlightTarget }: WarehouseMap2DProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  React.useEffect(() => {
    if (highlightTarget) {
      const element = document.getElementById(highlightTarget);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightTarget]);

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
      `}</style>

      {/* Inbound dock */}
      <div className="w-full mb-4 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shrink-0 bg-emerald-50 border border-dashed border-emerald-300">
        <span className="flex items-center gap-2 font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          🚚 CỬA NHẬP HÀNG (Inbound Docks) — Khu Tiếp Nhận & Kiểm Đếm
        </span>
        <span className="font-mono text-[10px] text-emerald-500">Luồng một chiều → GSP</span>
      </div>

      {/* Zone grid */}
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
              {/* Zone header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: cfg.headerBg, borderBottom: `1px solid ${cfg.borderColor}` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cfg.icon}</span>
                  <div>
                    <div className="text-xs font-bold tracking-wide" style={{ color: cfg.textColor }}>
                      {cfg.label}
                    </div>
                    <div className="text-[10px] mt-0.5 text-slate-500">{cfg.description}</div>
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

              {/* Racks */}
              <div className="p-3 grid gap-2.5 flex-1" onClick={(e) => e.stopPropagation()}>
                {zoneData.racks.map((rackData: any) => {
                  const rackStatus = getRackWorstStatus(rackData.shelves);
                  const rackStyle = STATUS_SHELF[rackStatus] || STATUS_SHELF.EMPTY;

                  return (
                    <div
                      key={rackData.rack}
                      className="rounded-xl p-2.5 bg-white border border-slate-200 shadow-sm"
                    >
                      {/* Rack header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <Layers size={11} className="text-slate-400" />
                          Kệ {rackData.rack}
                          <span className="font-mono text-[10px] text-slate-400">
                            · {rackData.shelves.reduce((a: number, s: any) => a + s.batchCount, 0)} lô
                          </span>
                        </div>
                        <div
                          className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: rackStyle.dot }}
                          title={`Trạng thái: ${rackStatus}`}
                        />
                      </div>

                      {/* Shelves - bottom to top */}
                      <div className="flex flex-col-reverse gap-1">
                        {rackData.shelves.map((shelfData: any) => {
                          const ss = STATUS_SHELF[shelfData.status] || STATUS_SHELF.EMPTY;
                          const targetId = `${zoneData.zone}-${rackData.rack}-${shelfData.shelf}`;
                          const isHighlighted = highlightTarget === targetId;

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
                    </div>
                  );
                })}
              </div>

              {/* Zone footer */}
              <div
                className="px-4 py-1.5 flex items-center justify-between text-[10px]"
                style={{ borderTop: `1px solid ${cfg.borderColor}`, backgroundColor: cfg.headerBg, color: "#94a3b8" }}
              >
                <span>{zoneData.racks.length} kệ · {zoneData.racks.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng</span>
                <span style={{ color: isHovered ? cfg.accentColor : undefined, transition: "color 0.2s", fontWeight: isHovered ? 600 : 400 }}>
                  Click để xem chi tiết →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outbound dock */}
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
