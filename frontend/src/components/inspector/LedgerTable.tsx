// Component Bảng Sổ Cái Giao Dịch Toàn Chuỗi CSDL Dược Quốc Gia
import React from "react";
import { ArrowDownLeft, ArrowUpRight, Activity, Copy, Check, Warehouse, Store } from "lucide-react";
import { NationalTransaction } from "./types";

interface LedgerTableProps {
  transactions: NationalTransaction[];
  copiedId: string | null;
  onCopyId: (id: string) => void;
  onInspectJson: (txn: NationalTransaction) => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  transactions,
  copiedId,
  onCopyId,
  onInspectJson,
}) => {
  return (
    <div className="flex-1 overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">Mã Giao Dịch QG</th>
            <th className="py-3 px-4">Cơ Sở Liên Thông</th>
            <th className="py-3 px-4">Loại GD</th>
            <th className="py-3 px-4">Lý Do / Nghiệp Vụ</th>
            <th className="py-3 px-4">Số Chứng Từ Gốc</th>
            <th className="py-3 px-4">Thời Điểm Ghi Sổ</th>
            <th className="py-3 px-4 text-center">Trạng Thái BYT</th>
            <th className="py-3 px-4 text-center">Gói Tin JSON</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                Chưa có giao dịch nào khớp với bộ lọc giám sát.
              </td>
            </tr>
          ) : (
            transactions.map((t) => {
              const isViolation = t.is_violation || t.status === "rejected";
              const isCentralWarehouse = t.facility_code === "FAC-HQ-01" || t.facility_type === "KHO_TONG_GSP";

              // Phân định huy hiệu loại giao dịch
              const getTypeBadge = () => {
                if (t.transaction_type === "STOCK_IN") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowDownLeft size={12} />
                      <span>Nhập Kho</span>
                    </span>
                  );
                }
                if (t.transaction_type === "STOCK_OUT") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      <ArrowUpRight size={12} />
                      <span>{t.reason === "transfer-out" ? "Chuyển Kho" : "Xuất Kho"}</span>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200">
                    <Activity size={12} />
                    <span>Kiểm Kê</span>
                  </span>
                );
              };

              return (
                <tr key={t.transaction_id} className="hover:bg-slate-50 transition-colors">
                  {/* Mã giao dịch */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    <div 
                      onClick={() => onCopyId(t.transaction_id)}
                      className="flex items-center gap-1.5 hover:text-[#0057cd] cursor-pointer group select-none w-fit"
                      title="Bấm để sao chép mã giao dịch"
                    >
                      <span>{t.transaction_id}</span>
                      {copiedId === t.transaction_id ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={11} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      )}
                    </div>
                  </td>

                  {/* Cơ sở phát sinh */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {isCentralWarehouse ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                            <Warehouse size={10} /> Kho Tổng GSP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Store size={10} /> Chi Nhánh GPP
                          </span>
                        )}
                        <span className="font-mono text-slate-500 text-[11px] font-semibold">{t.facility_code}</span>
                      </div>
                      <span className="text-[11px] text-slate-700 font-medium line-clamp-1 mt-0.5">
                        {t.facility_name || (isCentralWarehouse ? "Kho Tổng & TT Điều Phối GSP WDP301" : "Nhà thuốc Chi nhánh")}
                      </span>
                    </div>
                  </td>

                  {/* Loại giao dịch */}
                  <td className="py-3.5 px-4">
                    {getTypeBadge()}
                  </td>

                  {/* Lý do / Nghiệp vụ */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">
                        {t.reason === "supplier" ? "Nhập từ NCC GDP" :
                         t.reason === "transfer-out" ? "Xuất điều phối chi nhánh" :
                         t.reason === "transfer-in" ? "Nhận chuyển từ Kho Tổng" :
                         t.reason === "sale-retail" ? "Bán lẻ đơn thuốc" :
                         t.reason === "inventory_audit" ? "Kiểm kê định kỳ" :
                         t.reason}
                      </span>
                      {t.details?.note && (
                        <span className="text-[11px] text-slate-500 line-clamp-1">{t.details.note}</span>
                      )}
                    </div>
                  </td>

                  {/* Số chứng từ gốc */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    {t.reference_number}
                  </td>

                  {/* Thời điểm ghi sổ */}
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(t.created_at).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>

                  {/* Trạng thái liên thông BYT */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        isViolation
                          ? "bg-rose-100 text-rose-700 border border-rose-300"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isViolation ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                      {isViolation ? "TỪ CHỐI (VI PHẠM)" : "ĐÃ LIÊN THÔNG BYT"}
                    </span>
                  </td>

                  {/* Hành động: Chi tiết JSON */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onInspectJson(t)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-800 hover:text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
