import React, { useState } from "react";
import { Layers, AlertTriangle, CheckCircle, Clock, Package } from "lucide-react";

interface WarehouseMap2DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
  onZoneClick?: (zoneData: any) => void;
  highlightTarget?: string;
}

const ZONE_CONFIG: Record<string, {
  label: string;
  borderColor: string;
  bgColor: string;
  headerBg: string;
  textColor: string;
  accentColor: string;
  icon: string;
  description: string;
}> = {
  A: {
    label: "Khu A — Kháng Sinh",
    borderColor: "border-sky-500/50",
    bgColor: "bg-sky-950/25",
    headerBg: "bg-sky-900/40",
    textColor: "text-sky-300",
    accentColor: "#0284c7",
    icon: "💊",
    description: "Penicillin, Cephalosporin, Macrolide, Quinolone",
  },
  B: {
    label: "Khu B — Hạ Sốt & Giảm Đau",
    borderColor: "border-amber-500/50",
    bgColor: "bg-amber-950/20",
    headerBg: "bg-amber-900/30",
    textColor: "text-amber-300",
    accentColor: "#f59e0b",
    icon: "🌡️",
    description: "Paracetamol, Ibuprofen, Diclofenac, Aspirin",
  },
  C: {
    label: "Khu C — Tim Mạch",
    borderColor: "border-red-500/50",
    bgColor: "bg-red-950/20",
    headerBg: "bg-red-900/30",
    textColor: "text-red-300",
    accentColor: "#ef4444",
    icon: "❤️",
    description: "Amlodipine, Metoprolol, Atorvastatin, Warfarin",
  },
  D: {
    label: "Khu D — Tiêu Hóa",
    borderColor: "border-emerald-500/50",
    bgColor: "bg-emerald-950/20",
    headerBg: "bg-emerald-900/30",
    textColor: "text-emerald-300",
    accentColor: "#10b981",
    icon: "🫁",
    description: "Omeprazole, Metoclopramide, Smecta, Loperamide",
  },
  E: {
    label: "Khu E — TPCN",
    borderColor: "border-purple-500/50",
    bgColor: "bg-purple-950/20",
    headerBg: "bg-purple-900/30",
    textColor: "text-purple-300",
    accentColor: "#8b5cf6",
    icon: "🌿",
    description: "Vitamin, Khoáng chất, Omega-3, Collagen",
  },
  F: {
    label: "Khu F — Vật Tư Y Tế",
    borderColor: "border-slate-500/50",
    bgColor: "bg-slate-800/30",
    headerBg: "bg-slate-700/40",
    textColor: "text-slate-300",
    accentColor: "#64748b",
    icon: "🩺",
    description: "Băng, Gạc, Kim tiêm, Bơm tiêm, Dụng cụ y tế",
  },
};

const STATUS_SHELF: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  NORMAL: { bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-500/30", dot: "#22c55e" },
  LOW_STOCK: { bg: "bg-yellow-900/40", text: "text-yellow-300", border: "border-yellow-500/30", dot: "#eab308" },
  NEAR_EXPIRY: { bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-500/30", dot: "#f97316" },
  EXPIRED: { bg: "bg-red-900/40", text: "text-red-300", border: "border-red-500/30", dot: "#ef4444" },
  EMPTY: { bg: "bg-slate-800/40", text: "text-slate-500", border: "border-slate-600/30", dot: "#475569" },
  OUT_OF_STOCK: { bg: "bg-slate-800/30", text: "text-slate-600", border: "border-slate-700/30", dot: "#334155" },
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
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightTarget]);

  return (
    <div className="flex-1 h-full overflow-auto p-5 flex flex-col">
      {/* Zone label: Receiving entrance */}
      <div className="w-full mb-4 border border-dashed border-emerald-500/40 bg-emerald-950/10 rounded-xl px-4 py-2 flex items-center justify-between text-xs shrink-0">
        <span className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
          🚚 CỬA NHẬP HÀNG (Inbound Docks) — Khu Tiếp Nhận & Kiểm Đếm
        </span>
        <span className="text-emerald-600 font-mono text-[10px]">Luồng một chiều → GSP</span>
      </div>

      {/* Zone grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
        {zones.map((zoneData) => {
          const cfg = ZONE_CONFIG[zoneData.zone] || {
            label: `Khu ${zoneData.zone}`,
            borderColor: "border-slate-500/50",
            bgColor: "bg-slate-800/20",
            headerBg: "bg-slate-700/30",
            textColor: "text-slate-300",
            accentColor: "#64748b",
            icon: "📦",
            description: "",
          };

          const totalStock = zoneData.racks.reduce((a: number, r: any) =>
            a + r.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0);
          const alertShelves = zoneData.racks.reduce((a: number, r: any) =>
            a + r.shelves.filter((sh: any) => ["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(sh.status)).length, 0);
          const isHovered = hoveredZone === zoneData.zone;

          return (
            <div
              key={zoneData.zone}
              onMouseEnter={() => setHoveredZone(zoneData.zone)}
              onMouseLeave={() => setHoveredZone(null)}
              className={`border-2 ${cfg.borderColor} ${cfg.bgColor} rounded-2xl overflow-hidden flex flex-col transition-all duration-200 cursor-pointer ${isHovered ? "shadow-xl" : "shadow-lg"}`}
              style={{ boxShadow: isHovered ? `0 0 24px ${cfg.accentColor}22` : undefined }}
              onClick={() => onZoneClick && onZoneClick(zoneData)}
            >
              {/* Zone header */}
              <div className={`${cfg.headerBg} px-4 py-3 border-b border-white/5 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cfg.icon}</span>
                  <div>
                    <div className={`text-xs font-bold ${cfg.textColor} tracking-wide`}>{cfg.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{cfg.description}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold font-mono ${cfg.textColor}`}>{totalStock.toLocaleString("vi-VN")}</span>
                  {alertShelves > 0 && (
                    <span className="text-[10px] flex items-center gap-1 text-amber-400">
                      <AlertTriangle size={10} /> {alertShelves} cảnh báo
                    </span>
                  )}
                </div>
              </div>

              {/* Racks */}
              <div className="p-3 grid gap-3 flex-1" onClick={(e) => e.stopPropagation()}>
                {zoneData.racks.map((rackData: any) => {
                  const rackStatus = getRackWorstStatus(rackData.shelves);
                  const rackStyle = STATUS_SHELF[rackStatus] || STATUS_SHELF.EMPTY;
                  return (
                    <div key={rackData.rack} className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-2.5">
                      {/* Rack header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                          <Layers size={11} className="opacity-60" />
                          Kệ {rackData.rack}
                          <span className="text-slate-600 font-mono text-[10px]">
                            · {rackData.shelves.reduce((a: number, s: any) => a + s.batchCount, 0)} lô
                          </span>
                        </div>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: rackStyle.dot }}
                          title={`Trạng thái kệ: ${rackStatus}`}
                        />
                      </div>

                      {/* Shelves - bottom to top (ground = shelf 1 at bottom) */}
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
                              className={`shelf-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${ss.bg} ${ss.text} hover:brightness-125 ${isHighlighted ? "border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] pulse-dot" : ss.border}`}
                              title={`Tầng ${shelfData.shelf} · Tồn: ${shelfData.totalStock} · Trạng thái: ${shelfData.status}`}
                            >
                              <span className="opacity-80">T{shelfData.shelf}</span>
                              <span className="flex items-center gap-1.5 tabular-nums">
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
              <div className="px-4 py-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                <span>{zoneData.racks.length} kệ · {zoneData.racks.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng</span>
                <span className={isHovered ? cfg.textColor : ""}>Click để xem chi tiết →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receiving exit */}
      <div className="w-full mt-4 border border-dashed border-sky-500/40 bg-sky-950/10 rounded-xl px-4 py-2 flex items-center justify-between text-xs shrink-0">
        <span className="flex items-center gap-2 text-sky-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse inline-block" />
          🚛 CỬA XUẤT HÀNG (Outbound Docks) — Khu Soạn Đơn & Đóng Gói
        </span>
        <span className="text-sky-600 font-mono text-[10px]">FEFO / FIFO — WMS</span>
      </div>
    </div>
  );
}
