// Component Bảng Danh Mục Thuốc Quốc Gia Đã Liên Thông
import React from "react";

interface NationalDrugsCatalogProps {
  drugs: any[];
  loading: boolean;
}

export const NationalDrugsCatalog: React.FC<NationalDrugsCatalogProps> = ({ drugs, loading }) => {
  return (
    <div className="flex-1 overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">Mã Thuốc QG</th>
            <th className="py-3 px-4">Tên Biệt Dược</th>
            <th className="py-3 px-4">Hoạt Chất</th>
            <th className="py-3 px-4">Số Đăng Ký</th>
            <th className="py-3 px-4">Phân Loại</th>
            <th className="py-3 px-4">Đơn Vị / Quy Cách</th>
            <th className="py-3 px-4">Trạng Thái Đồng Bộ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                Đang tra cứu danh mục thuốc quốc gia...
              </td>
            </tr>
          ) : drugs.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                Không tìm thấy thuốc nào khớp với từ khóa.
              </td>
            </tr>
          ) : (
            drugs.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-[#0057cd]">
                  {d.national_drug_id || d.id?.slice(-8).toUpperCase()}
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                <td className="py-3 px-4 text-slate-600">
                  {d.active_pharmaceutical_ingredient || d.active_ingredient || "---"}
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                  {d.national_drug_code || d.registration_number || "Chưa cấp"}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.prescription_status === 1
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {d.prescription_status === 1 ? "ETC (Kê đơn)" : "OTC (Không kê đơn)"}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">
                  {d.unit || "Hộp"}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Đã đồng bộ BYT
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
