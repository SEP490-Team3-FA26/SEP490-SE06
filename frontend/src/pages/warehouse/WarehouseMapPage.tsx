import React, { useState, useEffect } from "react";
import {
  Loader2, Box, Layers, Boxes, Database, RefreshCw, Info, X,
  Thermometer, Package, AlertTriangle, CheckCircle, Clock, MapPin
} from "lucide-react";
import { inventoryMapService } from "../../services/inventory/inventoryMap.service";
import { WarehouseMap2D } from "./components/WarehouseMap2D";
import { WarehouseMap3D } from "./components/WarehouseMap3D";
import { ShelfDetailModal } from "./components/ShelfDetailModal";
import { WarehouseSearchBar } from "./components/WarehouseSearchBar";

const ZONE_META: Record<string, { label: string; color: string; borderColor: string; bgColor: string; textColor: string; icon: string }> = {
  A: { label: "Khu A - Kháng sinh", color: "#0284c7", borderColor: "border-sky-500/60", bgColor: "bg-sky-950/30", textColor: "text-sky-300", icon: "💊" },
  B: { label: "Khu B - Hạ sốt & Giảm đau", color: "#f59e0b", borderColor: "border-amber-500/60", bgColor: "bg-amber-950/20", textColor: "text-amber-300", icon: "🌡️" },
  C: { label: "Khu C - Tim mạch", color: "#ef4444", borderColor: "border-red-500/60", bgColor: "bg-red-950/20", textColor: "text-red-300", icon: "❤️" },
  D: { label: "Khu D - Tiêu hóa", color: "#10b981", borderColor: "border-emerald-500/60", bgColor: "bg-emerald-950/20", textColor: "text-emerald-300", icon: "🫀" },
  E: { label: "Khu E - TPCN", color: "#8b5cf6", borderColor: "border-purple-500/60", bgColor: "bg-purple-950/20", textColor: "text-purple-300", icon: "🌿" },
  F: { label: "Khu F - Vật tư y tế", color: "#64748b", borderColor: "border-slate-500/60", bgColor: "bg-slate-800/40", textColor: "text-slate-300", icon: "🩺" },
};

export function WarehouseMapPage() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<{ zone: string; rack: string; shelf: number } | null>(null);
  const [drawerZone, setDrawerZone] = useState<any | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<string>("");

  useEffect(() => { fetchMapData(); }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const res = await inventoryMapService.getWarehouseMap();
      setZones(res?.zones || res?.data?.zones || []);
    } catch (error) {
      console.error("Failed to fetch warehouse map", error);
    } finally {
      setLoading(false);
    }
  };

  // Tính tổng thống kê
  const totalBatches = zones.reduce((acc, z) =>
    acc + z.racks.reduce((r: number, rack: any) =>
      r + rack.shelves.reduce((s: number, sh: any) => s + sh.batchCount, 0), 0), 0);
  const totalStock = zones.reduce((acc, z) =>
    acc + z.racks.reduce((r: number, rack: any) =>
      r + rack.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0), 0);
  const alertCount = zones.reduce((acc, z) =>
    acc + z.racks.reduce((r: number, rack: any) =>
      r + rack.shelves.filter((sh: any) => sh.status === "NEAR_EXPIRY" || sh.status === "EXPIRED" || sh.status === "LOW_STOCK").length, 0), 0);

  if (loading && zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-950 rounded-2xl p-6 m-6">
        <Loader2 className="animate-spin text-sky-400 mb-4" size={40} />
        <p className="text-slate-400 font-medium">Đang tải sơ đồ kho...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden m-0">
      {/* Blueprint grid background */}
      <style>{`
        .blueprint-grid {
          background-size: 24px 24px;
          background-image:
            linear-gradient(to right, rgba(56,189,248,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56,189,248,0.06) 1px, transparent 1px);
        }
        .shelf-btn:hover { filter: brightness(1.15); }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .pulse-dot { animation: pulseGlow 2s infinite; }
      `}</style>

      {/* Header */}
      <header className="h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-sky-600 to-teal-500 rounded-xl shadow-lg shadow-sky-500/20 text-white">
            <Boxes size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">
              Sơ Đồ Kho Tổng — Phòng Khám
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {zones.length} Khu · {totalBatches} Lô hàng
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Chuẩn GSP — Quản lý theo vị trí Zone / Kệ / Tầng</p>
          </div>
        </div>

        {/* Stats quick bar */}
        <div className="hidden xl:flex items-center gap-3 text-xs bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 text-slate-300">
          <span className="flex items-center gap-1">
            <Database size={13} className="text-sky-400" />
            <b>{totalStock.toLocaleString("vi-VN")}</b> tổng tồn
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <Package size={13} className="text-teal-400" />
            <b>{totalBatches}</b> lô hàng
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={13} className="text-amber-400" />
            <b>{alertCount}</b> cảnh báo
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <WarehouseSearchBar onSelect={(target) => setHighlightTarget(target)} />
          <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
            <button
              onClick={fetchMapData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            {/* 2D / 3D tabs */}
            <div className="bg-slate-800/90 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                onClick={() => setViewMode("2d")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode === "2d" ? "bg-sky-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
              >
                <Layers size={14} /> Mặt bằng 2D
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode === "3d" ? "bg-sky-600 text-white shadow-md" : "text-slate-300 hover:text-white"}`}
              >
                <Box size={14} /> Mô hình 3D
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative flex overflow-hidden blueprint-grid">
        {viewMode === "2d" ? (
          <WarehouseMap2D
            zones={zones}
            onShelfSelect={(zone, rack, shelf) => setSelectedShelf({ zone, rack, shelf })}
            onZoneClick={(zoneData) => setDrawerZone(zoneData)}
            highlightTarget={highlightTarget}
          />
        ) : (
          <WarehouseMap3D
            zones={zones}
            onShelfSelect={(zone, rack, shelf) => setSelectedShelf({ zone, rack, shelf })}
            highlightTarget={highlightTarget}
          />
        )}

        {/* Zone Detail Drawer */}
        {drawerZone && (
          <aside className="absolute top-4 right-4 w-[380px] max-h-[calc(100%-2rem)] overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-5 z-20">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg text-2xl">{ZONE_META[drawerZone.zone]?.icon || "📦"}</div>
                <div>
                  <h3 className="font-bold text-base text-white">{drawerZone.label}</h3>
                  <p className="text-xs text-sky-400">{drawerZone.racks?.length} kệ — {drawerZone.racks?.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng</p>
                </div>
              </div>
              <button onClick={() => setDrawerZone(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
                <X size={16} />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400"><Package size={14} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Tổng tồn kho</div>
                  <div className="text-sm font-bold text-slate-100">
                    {drawerZone.racks?.reduce((a: number, r: any) => a + r.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><AlertTriangle size={14} /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Cảnh báo</div>
                  <div className="text-sm font-bold text-slate-100">
                    {drawerZone.racks?.reduce((a: number, r: any) =>
                      a + r.shelves.filter((sh: any) => ["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(sh.status)).length, 0)} tầng kệ
                  </div>
                </div>
              </div>
            </div>

            {/* Rack list */}
            <div className="space-y-2">
              {drawerZone.racks?.map((rack: any) => (
                <div key={rack.rack} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                  <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Layers size={12} className="text-sky-400" /> Kệ {rack.rack}
                  </div>
                  <div className="flex flex-col-reverse gap-1">
                    {rack.shelves.map((sh: any) => (
                      <button
                        key={sh.shelf}
                        onClick={() => { setSelectedShelf({ zone: drawerZone.zone, rack: rack.rack, shelf: sh.shelf }); setDrawerZone(null); }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shelf-btn ${getShelfBgDark(sh.status)}`}
                      >
                        <span>Tầng {sh.shelf}</span>
                        <span className="opacity-80 tabular-nums">{sh.totalStock.toLocaleString("vi-VN")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Bình thường
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block ml-2"></span> Sắp hết
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block ml-2"></span> Cận date
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-2"></span> Hết hạn
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block ml-2"></span> Trống
            </div>
          </aside>
        )}

        {/* Bottom hint */}
        {viewMode === "3d" && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 px-3 py-2 rounded-lg text-xs text-slate-300 flex items-center gap-2 shadow-lg">
              <MapPin size={14} className="text-sky-400" />
              <span><b>Chuột trái:</b> Xoay | <b>Phải:</b> Trượt | <b>Cuộn:</b> Zoom | <b>Click:</b> Xem chi tiết</span>
            </div>
          </div>
        )}
      </main>

      {/* Legend bar */}
      <div className="shrink-0 h-10 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-6 px-4 text-[11px] text-slate-400">
        {[
          { color: "bg-emerald-500", label: "Bình thường" },
          { color: "bg-yellow-500", label: "Sắp hết hàng" },
          { color: "bg-orange-500", label: "Cận date (<90 ngày)" },
          { color: "bg-red-500", label: "Hết hạn" },
          { color: "bg-slate-600", label: "Trống / Hết hàng" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Shelf Detail Modal */}
      {selectedShelf && (
        <ShelfDetailModal
          zone={selectedShelf.zone}
          rack={selectedShelf.rack}
          shelf={selectedShelf.shelf}
          onClose={() => setSelectedShelf(null)}
        />
      )}
    </div>
  );
}

function getShelfBgDark(status: string) {
  const map: Record<string, string> = {
    NORMAL: "bg-emerald-900/40 border border-emerald-500/30 text-emerald-300",
    LOW_STOCK: "bg-yellow-900/40 border border-yellow-500/30 text-yellow-300",
    NEAR_EXPIRY: "bg-orange-900/40 border border-orange-500/30 text-orange-300",
    EXPIRED: "bg-red-900/40 border border-red-500/30 text-red-300",
    EMPTY: "bg-slate-800/40 border border-slate-600/30 text-slate-500",
  };
  return map[status] || map.EMPTY;
}

export default WarehouseMapPage;
