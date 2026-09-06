import React, { useState, useEffect } from "react";
import { X, Loader2, Package, Calendar, AlertTriangle } from "lucide-react";
import { inventoryMapService } from "../../../services/inventory/inventoryMap.service";

interface ShelfDetailModalProps {
  zone: string;
  rack: string;
  shelf: number;
  onClose: () => void;
}

export function ShelfDetailModal({ zone, rack, shelf, onClose }: ShelfDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    inventoryMapService.getShelfDetail(zone, rack, shelf)
      .then(res => setData(res?.data || res || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [zone, rack, shelf]);

  const totalBatches = data.length;
  const totalStock = data.reduce((sum, item) => sum + item.stock, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-teal-600" />
              Chi tiết Kệ {rack} - Tầng {shelf}
            </h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-600">
                Khu: {zone}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Đang tải dữ liệu kệ hàng...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Package size={48} className="mb-4 opacity-50" />
              <p className="font-medium text-lg text-slate-500">Tầng kệ này đang trống</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Tên thuốc</th>
                    <th className="p-4">Mã lô</th>
                    <th className="p-4 text-right">Số lượng</th>
                    <th className="p-4">Đơn vị</th>
                    <th className="p-4">Hạn sử dụng</th>
                    <th className="p-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{item.medicineName}</td>
                      <td className="p-4 text-slate-500">{item.batchNo}</td>
                      <td className="p-4 text-right font-semibold text-slate-700">{item.stock}</td>
                      <td className="p-4 text-slate-500">{item.unit}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{item.expDate}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.status === 'EXPIRED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle size={12} /> Hết hạn
                          </span>
                        ) : item.status === 'NEAR_EXPIRY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            <AlertTriangle size={12} /> Cận date ({item.daysUntilExpiry} ngày)
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            An toàn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center text-sm font-medium text-slate-600">
          <div>Tổng số lô: <span className="text-slate-800 font-bold">{totalBatches}</span></div>
          <div>Tổng tồn kho: <span className="text-teal-600 font-bold text-lg">{totalStock}</span> đơn vị</div>
        </div>
      </div>
    </div>
  );
}
