import React, { useState, useEffect } from "react";
import { Loader2, Box, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { inventoryMapService } from "../../services/inventory/inventoryMap.service";
import { WarehouseMap2D } from "./components/WarehouseMap2D";
import { WarehouseMap3D } from "./components/WarehouseMap3D";
import { ShelfDetailModal } from "./components/ShelfDetailModal";

export function WarehouseMapPage() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<{ zone: string, rack: string, shelf: number } | null>(null);

  useEffect(() => {
    fetchMapData();
  }, []);

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

  const handleShelfSelect = (zone: string, rack: string, shelf: number) => {
    setSelectedShelf({ zone, rack, shelf });
  };

  const handleSyncLocations = async () => {
    try {
      setLoading(true);
      await inventoryMapService.syncLocations();
      await fetchMapData();
    } catch (error) {
      console.error("Failed to sync locations", error);
      setLoading(false);
    }
  };

  if (loading && zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 m-6">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Đang tải sơ đồ kho...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white z-10">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Sơ đồ Kho Tổng
          </h2>
          <p className="text-slate-500 mt-1">Giám sát vị trí và trạng thái tồn kho thực tế</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSyncLocations}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đồng bộ Vị trí (Migration)
          </button>
          
          {/* Toggle Button */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === "2d" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Layers size={18} /> 2D
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                viewMode === "3d" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Box size={18} /> 3D
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-50/50 p-6">
        <AnimatePresence mode="wait">
          {viewMode === "2d" ? (
            <motion.div
              key="2d"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-6"
            >
              <WarehouseMap2D zones={zones} onShelfSelect={handleShelfSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-6 shadow-inner rounded-2xl overflow-hidden"
            >
              <WarehouseMap3D zones={zones} onShelfSelect={handleShelfSelect} />
            </motion.div>
          )}
        </AnimatePresence>
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

export default WarehouseMapPage;
