import React, { useState, useEffect } from "react";
import { MapPin, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface BinLocationPickerProps {
  medicineId: string;
  medicineName?: string;
  unit?: string;
  value: { zone: string; rack: string; shelf: number; bin: number; slotType?: 'MAIN' | 'RESERVE' };
  onChange: (loc: { zone: string; rack: string; shelf: number; bin: number; slotType: 'MAIN' | 'RESERVE' }) => void;
  error?: string;
}

const ZONE_OPTIONS = [
  { value: 'A', label: 'Khu A' },
  { value: 'B', label: 'Khu B' },
  { value: 'C', label: 'Khu C' },
  { value: 'D', label: 'Khu D' },
  { value: 'E', label: 'Khu E' },
  { value: 'F', label: 'Khu F' },
];

const SHELF_OPTIONS = [1, 2, 3, 4];
const BIN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getRackOptions = (zone: string) => {
  const counts: Record<string, number> = { A: 4, B: 4, C: 4, D: 4, E: 4, F: 4 };
  const n = counts[zone] || 4;
  return Array.from({ length: n }, (_, i) => `${zone}${i + 1}`);
};

export function BinLocationPicker({
  medicineId,
  medicineName,
  unit = "Hộp",
  value,
  onChange,
  error,
}: BinLocationPickerProps) {
  const [existingBinInfo, setExistingBinInfo] = useState<{
    hasOldBatch: boolean;
    oldBatchCount: number;
    oldStock: number;
    nearestExp?: string;
    medicineName?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const zone = value?.zone || 'A';
  const rack = value?.rack || 'A1';
  const shelf = Number(value?.shelf || 1);
  const bin = Number(value?.bin || 1);

  // Kiểm tra thông tin thùng khi vị trí thay đổi
  useEffect(() => {
    let active = true;
    setChecking(true);
    inventoryMapService.getBinDetail(zone, rack, shelf, bin)
      .then((data: any) => {
        if (!active) return;
        const mainBatches = data?.mainBatches || [];
        const oldStock = data?.totalMainStock || mainBatches.reduce((s: number, b: any) => s + (b.stock || 0), 0);
        if (mainBatches.length > 0 && oldStock > 0) {
          setExistingBinInfo({
            hasOldBatch: true,
            oldBatchCount: mainBatches.length,
            oldStock,
            nearestExp: mainBatches[0]?.expDate ? new Date(mainBatches[0].expDate).toLocaleDateString('vi-VN') : undefined,
            medicineName: data?.medicine?.name || data?.location?.medicineName,
          });
        } else {
          setExistingBinInfo(null);
        }
      })
      .catch(() => {
        if (active) setExistingBinInfo(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => { active = false; };
  }, [zone, rack, shelf, bin]);

  const handleZoneChange = (newZone: string) => {
    const firstRack = `${newZone}1`;
    onChange({ zone: newZone, rack: firstRack, shelf: 1, bin: 1, slotType: 'MAIN' });
  };

  const handleRackChange = (newRack: string) => {
    onChange({ ...value, rack: newRack, slotType: 'MAIN' });
  };

  const handleShelfChange = (newShelf: number) => {
    onChange({ ...value, shelf: newShelf, slotType: 'MAIN' });
  };

  const handleBinChange = (newBin: number) => {
    onChange({ ...value, bin: newBin, slotType: 'MAIN' });
  };

  return (
    <div className="mt-2 pt-2 border-t border-slate-200">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wide">
          <MapPin size={12} className="text-emerald-600" />
          <span>Vị trí xếp hàng: Khu → Kệ → Tầng → Thùng (Bin 1..10)</span>
        </label>
        <span className="text-[10px] text-slate-500">Đơn vị: <b className="text-slate-700">{unit}</b></span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* KHU */}
        <div>
          <label className="text-[9px] text-slate-500 font-bold mb-1 block uppercase">1. Khu (Zone)</label>
          <select
            value={zone}
            onChange={(e) => handleZoneChange(e.target.value)}
            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 ${
              error ? "border-rose-400 focus:ring-rose-400" : "border-emerald-300 focus:ring-emerald-500"
            }`}
          >
            {ZONE_OPTIONS.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </div>

        {/* KỆ */}
        <div>
          <label className="text-[9px] text-slate-500 font-bold mb-1 block uppercase">2. Kệ (Rack)</label>
          <select
            value={rack}
            onChange={(e) => handleRackChange(e.target.value)}
            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 ${
              error ? "border-rose-400 focus:ring-rose-400" : "border-emerald-300 focus:ring-emerald-500"
            }`}
          >
            {getRackOptions(zone).map((r) => (
              <option key={r} value={r}>Kệ {r}</option>
            ))}
          </select>
        </div>

        {/* TẦNG */}
        <div>
          <label className="text-[9px] text-slate-500 font-bold mb-1 block uppercase">3. Tầng (Shelf)</label>
          <select
            value={shelf}
            onChange={(e) => handleShelfChange(Number(e.target.value))}
            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 ${
              error ? "border-rose-400 focus:ring-rose-400" : "border-emerald-300 focus:ring-emerald-500"
            }`}
          >
            {SHELF_OPTIONS.map((s) => (
              <option key={s} value={s}>Tầng {s}</option>
            ))}
          </select>
        </div>

        {/* THÙNG */}
        <div>
          <label className="text-[9px] text-slate-500 font-bold mb-1 block uppercase">4. Thùng (Bin)</label>
          <select
            value={bin}
            onChange={(e) => handleBinChange(Number(e.target.value))}
            className={`w-full px-2 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 ${
              error ? "border-rose-400 focus:ring-rose-400" : "border-emerald-300 focus:ring-emerald-500"
            }`}
          >
            {BIN_OPTIONS.map((b) => (
              <option key={b} value={b}>Thùng B{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cảnh báo lô cũ FEFO nếu thùng đã có thuốc */}
      {existingBinInfo?.hasOldBatch && (
        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">⚠️ Thùng {rack}-T{shelf}-B{bin} hiện đã có {existingBinInfo.oldStock} {unit} cũ!</span>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
              Khi nghiệm thu lô mới này, hệ thống sẽ <b>tự động dời {existingBinInfo.oldBatchCount} lô cũ sang Khu Dự Trữ</b> để đảm bảo nguyên tắc FEFO (lấy lô cận date xuất trước).
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-[10px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
