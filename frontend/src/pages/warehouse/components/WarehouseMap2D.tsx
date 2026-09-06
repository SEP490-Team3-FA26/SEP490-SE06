import React from "react";
import { DoorOpen, Layers, Search } from "lucide-react";

interface WarehouseMap2DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
}

export function WarehouseMap2D({ zones, onShelfSelect }: WarehouseMap2DProps) {
  // Map màu theo trạng thái
  const statusColorMap: Record<string, string> = {
    NORMAL: "bg-green-100 text-green-700 border-green-300",
    LOW_STOCK: "bg-yellow-100 text-yellow-700 border-yellow-300",
    NEAR_EXPIRY: "bg-red-100 text-red-700 border-red-300",
    EMPTY: "bg-slate-100 text-slate-500 border-slate-300",
  };

  const statusDotMap: Record<string, string> = {
    NORMAL: "bg-green-500",
    LOW_STOCK: "bg-yellow-500",
    NEAR_EXPIRY: "bg-red-500",
    EMPTY: "bg-slate-300",
  };

  // Xác định trạng thái xấu nhất của một rack để hiện màu tổng quan
  const getRackStatus = (shelves: any[]) => {
    if (shelves.some((s) => s.status === "NEAR_EXPIRY")) return "NEAR_EXPIRY";
    if (shelves.some((s) => s.status === "LOW_STOCK")) return "LOW_STOCK";
    if (shelves.every((s) => s.status === "EMPTY")) return "EMPTY";
    return "NORMAL";
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] rounded-2xl p-6 shadow-inner overflow-auto">
      {/* Entrance / Exit area */}
      <div className="w-full h-16 border-2 border-dashed border-slate-300 rounded-xl mb-8 flex items-center justify-center text-slate-400 font-bold tracking-widest gap-2 bg-white/50">
        <DoorOpen size={24} />
        LỐI VÀO / RA KHU VỰC KHO
      </div>

      {/* Map Grid */}
      <div className="flex-1 overflow-auto pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {zones.map((zoneData, zIndex) => (
            <div key={zIndex} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              {/* Zone Header */}
              <div className={`p-4 border-b border-slate-100 bg-gradient-to-r ${getZoneBg(zoneData.zone)}`}>
                <h3 className={`font-black text-lg ${getZoneTextColor(zoneData.zone)}`}>Khu {zoneData.zone}</h3>
                <p className={`text-xs font-medium opacity-80 ${getZoneTextColor(zoneData.zone)}`}>{zoneData.label.split('-')[1]?.trim()}</p>
              </div>

              {/* Racks & Shelves */}
              <div className="p-4 grid gap-4 bg-slate-50/50 flex-1">
                {zoneData.racks.map((rackData: any, rIndex: number) => {
                  const rackStatus = getRackStatus(rackData.shelves);
                  return (
                    <div key={rIndex} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Layers size={16} className="text-slate-400" />
                          Kệ {rackData.rack}
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${statusDotMap[rackStatus]} shadow-sm`} title={`Trạng thái: ${rackStatus}`}></div>
                      </div>

                      {/* Tầng (Shelves) - hiển thị dạng khối ngang */}
                      <div className="flex flex-col-reverse gap-1.5">
                        {rackData.shelves.map((shelfData: any, sIndex: number) => (
                          <button
                            key={sIndex}
                            onClick={() => onShelfSelect(zoneData.zone, rackData.rack, shelfData.shelf)}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-semibold hover:brightness-95 transition-all ${statusColorMap[shelfData.status]}`}
                            title={`Tầng ${shelfData.shelf} - Tồn kho: ${shelfData.totalStock} - Click để xem chi tiết`}
                          >
                            <span>Tầng {shelfData.shelf}</span>
                            <span className="opacity-80 tabular-nums">{shelfData.totalStock}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-600 bg-[#f8f9fc]">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Bình thường</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Sắp hết hàng (Dưới định mức)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Cận date (Dưới 90 ngày)</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300"></div> Trống</div>
      </div>
    </div>
  );
}

// Helpers for zone colors
function getZoneBg(zone: string) {
  const map: any = {
    'A': 'from-blue-50 to-white',
    'B': 'from-orange-50 to-white',
    'C': 'from-red-50 to-white',
    'D': 'from-green-50 to-white',
    'E': 'from-yellow-50 to-white',
    'F': 'from-slate-100 to-white'
  };
  return map[zone] || 'from-slate-50 to-white';
}

function getZoneTextColor(zone: string) {
  const map: any = {
    'A': 'text-blue-700',
    'B': 'text-orange-700',
    'C': 'text-red-700',
    'D': 'text-green-700',
    'E': 'text-yellow-700',
    'F': 'text-slate-600'
  };
  return map[zone] || 'text-slate-700';
}
