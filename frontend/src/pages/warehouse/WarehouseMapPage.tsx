import React, { useState, useEffect } from "react";
import {
  Loader2, Boxes, Database, RefreshCw, X,
  Package, AlertTriangle, Layers, Archive,
} from "lucide-react";
import { inventoryMapService, ReserveBatch } from "../../services/inventory/inventoryMap.service";
import { WarehouseMap2D } from "./components/WarehouseMap2D";
import { ShelfDetailModal } from "./components/ShelfDetailModal";
import { WarehouseFilterBar } from "./components/WarehouseFilterBar";
import { ReserveBatchesPanel } from "./components/ReserveBatchesPanel";

export function WarehouseMapPage() {
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<{ zone: string; rack: string; shelf: number; bin?: number | null } | null>(null);
  const [drawerZone, setDrawerZone] = useState<any | null>(null);
  const [highlightTargets, setHighlightTargets] = useState<Set<string>>(new Set());
  const [highlightTarget, setHighlightTarget] = useState<string>("");
  const [filterDesc, setFilterDesc] = useState<string>("");

  // Trạng thái các lô Khu Dự Trữ
  const [reserveBatches, setReserveBatches] = useState<ReserveBatch[]>([]);
  const [loadingReserve, setLoadingReserve] = useState(false);
  const [showReservePanel, setShowReservePanel] = useState(true);

  useEffect(() => { 
    fetchMapData(); 
    fetchReserveBatches();
  }, []);

  const fetchReserveBatches = async () => {
    setLoadingReserve(true);
    try {
      const data = await inventoryMapService.getReserveBatches();
      setReserveBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch reserve batches", e);
    } finally {
      setLoadingReserve(false);
    }
  };

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const res = await inventoryMapService.getWarehouseMap();
      setZones(res?.zones || (res as any)?.data?.zones || []);
    } catch (error) {
      console.error("Failed to fetch warehouse map", error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-2xl p-6 m-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
        <p className="text-slate-600 font-semibold text-sm">Đang tải sơ đồ kho...</p>
        <p className="text-slate-400 text-xs mt-1">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 relative overflow-hidden">
      <style>{`
        .shelf-btn { transition: all 0.15s ease; }
        .shelf-btn:hover { transform: translateY(-1px); filter: brightness(0.95); }
        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(14,165,233,0); }
        }
        .highlighted-shelf { animation: highlightPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500 shadow text-white shrink-0">
            <Boxes size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Sơ Đồ Kho Tổng — Phòng Khám
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                {zones.length} Khu · {totalBatches} Lô hàng
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Chuẩn GSP — Quản lý theo vị trí Zone / Kệ / Tầng</p>
          </div>
        </div>

        {/* Thống kê & Thao tác */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-sky-50 border border-sky-200 text-sky-700">
              <Database size={13} className="text-sky-500" />
              <span><b>{totalStock.toLocaleString("vi-VN")}</b> tổng tồn</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-teal-50 border border-teal-200 text-teal-700">
              <Package size={13} className="text-teal-500" />
              <span><b>{totalBatches}</b> lô hàng</span>
            </div>
            {alertCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-700">
                <AlertTriangle size={13} className="text-amber-500" />
                <span><b>{alertCount}</b> cảnh báo</span>
              </div>
            )}
          </div>

          {/* Nút bật/tắt Khu Kệ Dự Trữ FEFO */}
          <button
            onClick={() => setShowReservePanel(!showReservePanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              showReservePanel 
                ? "bg-amber-500 text-white border-amber-600 shadow-sm" 
                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
            }`}
            title="Mở bảng Lô Dự Trữ cũ (FEFO)"
          >
            <Archive size={14} />
            <span>Khu Kệ Dự Trữ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${showReservePanel ? "bg-amber-600 text-white" : "bg-amber-200 text-amber-900"}`}>
              {reserveBatches.length}
            </span>
          </button>

          <button
            onClick={() => { fetchMapData(); fetchReserveBatches(); }}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all border border-slate-200 bg-white"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Toolbar: Bộ lọc & Tìm kiếm trực quan */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 shrink-0 z-10 shadow-xs">
        <WarehouseFilterBar
          zones={zones}
          onSearchSelect={(target) => {
            if (target === 'RESERVE') {
              setShowReservePanel(true);
            } else if (target) {
              setHighlightTarget(target);
              setHighlightTargets(new Set([target]));
              setFilterDesc("");
            }
          }}
          onFilterChange={(targets, desc) => {
            setHighlightTargets(targets);
            setHighlightTarget("");
            setFilterDesc(desc || "");
          }}
        />
      </div>

      {/* Filter status indicator khi đang có bộ lọc active */}
      {filterDesc && (
        <div className="bg-sky-50/90 border-b border-sky-200/80 px-5 py-1.5 flex items-center justify-between text-xs text-sky-800 shrink-0 z-10 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-semibold">{filterDesc}</span>
            <span className="text-[11px] text-sky-600 hidden md:inline">
              (Các vị trí tương ứng trên sơ đồ đang được làm sáng viền xanh)
            </span>
          </div>
          <button
            onClick={() => {
              setHighlightTargets(new Set());
              setHighlightTarget("");
              setFilterDesc("");
            }}
            className="text-[11px] text-sky-600 hover:text-sky-800 underline font-medium cursor-pointer"
          >
            Tắt highlight
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 relative flex overflow-hidden">
        <WarehouseMap2D
          zones={zones}
          onShelfSelect={(zone, rack, shelf) => setSelectedShelf({ zone, rack, shelf })}
          onBinSelect={(zone, rack, shelf, bin) => setSelectedShelf({ zone, rack, shelf, bin })}
          onZoneClick={(zoneData) => setDrawerZone(zoneData)}
          highlightTargets={highlightTargets}
          highlightTarget={highlightTarget}
        />

        {/* Zone Detail Drawer */}
        {drawerZone && (
          <aside className="absolute top-4 right-4 w-[380px] max-h-[calc(100%-2rem)] overflow-y-auto rounded-2xl shadow-xl p-5 z-20 bg-white border border-slate-200">
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-2xl">{drawerZone.icon || "📦"}</div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">{drawerZone.label}</h3>
                  <p className="text-xs text-sky-500 font-medium">{drawerZone.racks?.length} kệ — {drawerZone.racks?.reduce((a: number, r: any) => a + r.shelves.length, 0)} tầng</p>
                </div>
              </div>
              <button onClick={() => setDrawerZone(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                <X size={15} />
              </button>
            </div>

            {/* Thống kê */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl p-2.5 flex items-center gap-2 bg-sky-50 border border-sky-200">
                <div className="p-1.5 rounded-lg bg-sky-100"><Package size={14} className="text-sky-600" /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Tổng tồn kho</div>
                  <div className="text-sm font-bold text-slate-700">
                    {drawerZone.racks?.reduce((a: number, r: any) => a + r.shelves.reduce((s: number, sh: any) => s + sh.totalStock, 0), 0).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-2.5 flex items-center gap-2 bg-amber-50 border border-amber-200">
                <div className="p-1.5 rounded-lg bg-amber-100"><AlertTriangle size={14} className="text-amber-600" /></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">Cảnh báo</div>
                  <div className="text-sm font-bold text-slate-700">
                    {drawerZone.racks?.reduce((a: number, r: any) =>
                      a + r.shelves.filter((sh: any) => ["NEAR_EXPIRY", "EXPIRED", "LOW_STOCK"].includes(sh.status)).length, 0)} tầng kệ
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách Kệ */}
            <div className="space-y-2">
              {drawerZone.racks?.map((rack: any) => (
                <div key={rack.rack} className="rounded-xl p-3 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
                    <Layers size={11} /> Kệ {rack.rack}
                  </div>
                  <div className="flex flex-col-reverse gap-1">
                    {rack.shelves.map((sh: any) => (
                      <button
                        key={sh.shelf}
                        onClick={() => { setSelectedShelf({ zone: drawerZone.zone, rack: rack.rack, shelf: sh.shelf }); setDrawerZone(null); }}
                        className="shelf-btn w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={getShelfLightStyle(sh.status)}
                      >
                        <span>Tầng {sh.shelf}</span>
                        <span className="tabular-nums">{sh.totalStock.toLocaleString("vi-VN")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Chú thích màu */}
            <div className="mt-4 pt-3 flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap border-t border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Bình thường
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block ml-2" /> Sắp hết
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block ml-2" /> Cận date
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-2" /> Hết hạn
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block ml-2" /> Trống
            </div>
          </aside>
        )}
      </main>

      {/* Bảng Khu Kệ Dự Trữ (Ngăn kéo dưới đáy) */}
      {showReservePanel && (
        <ReserveBatchesPanel
          batches={reserveBatches}
          loading={loadingReserve}
          onRefresh={fetchReserveBatches}
          onSelectBatch={(batch) => {
            if (batch.location?.zone && batch.location.zone !== 'RESERVE') {
              setSelectedShelf({
                zone: batch.location.zone,
                rack: batch.location.rack,
                shelf: batch.location.shelf,
                bin: batch.location.bin,
              });
            } else {
              // Làm sáng vị trí hoặc thông báo
              setHighlightTarget(batch.medicineName);
            }
          }}
          onClose={() => setShowReservePanel(false)}
        />
      )}

      {/* Thanh chú giải trạng thái */}
      <div className="shrink-0 h-10 bg-white border-t border-slate-200 flex items-center justify-center gap-6 px-4 text-[11px] text-slate-500">
        {[
          { color: "#22c55e", label: "Bình thường" },
          { color: "#facc15", label: "Sắp hết hàng" },
          { color: "#f97316", label: "Cận date (<90 ngày)" },
          { color: "#ef4444", label: "Hết hạn" },
          { color: "#94a3b8", label: "Trống / Hết hàng" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Modal Chi tiết Tầng Kệ (Hỗ trợ cả chế độ Ô Thùng & Tầng Kệ) */}
      {selectedShelf && (
        <ShelfDetailModal
          zone={selectedShelf.zone}
          rack={selectedShelf.rack}
          shelf={selectedShelf.shelf}
          bin={selectedShelf.bin}
          onClose={() => setSelectedShelf(null)}
          onRefresh={() => {
            fetchMapData();
            fetchReserveBatches();
          }}
        />
      )}
    </div>
  );
}

function getShelfLightStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    NORMAL:      { background: "#dcfce7", border: "1px solid #86efac", color: "#15803d" },
    LOW_STOCK:   { background: "#fef9c3", border: "1px solid #fde047", color: "#a16207" },
    NEAR_EXPIRY: { background: "#ffedd5", border: "1px solid #fdba74", color: "#c2410c" },
    EXPIRED:     { background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" },
    EMPTY:       { background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#94a3b8" },
  };
  return map[status] || map.EMPTY;
}

export default WarehouseMapPage;
