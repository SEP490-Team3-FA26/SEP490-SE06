// Component Thanh Điều Hướng Tab và Bộ Lọc Đa Chiều Giám Sát
import React from "react";
import { FileText, AlertTriangle, Pill, Warehouse, Store, Search } from "lucide-react";
import { ActiveTabType, FacilityFilterType, NationalFacility } from "./types";

interface InspectorFilterBarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  transactionsCount: number;
  violationsCount: number;
  facilityFilterType: FacilityFilterType;
  setFacilityFilterType: (type: FacilityFilterType) => void;
  hqTransactionsCount: number;
  branchTransactionsCount: number;
  selectedFacility: string;
  setSelectedFacility: (val: string) => void;
  selectedTxnType: string;
  setSelectedTxnType: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  facilities: NationalFacility[];
  drugSearch: string;
  setDrugSearch: (val: string) => void;
  onClearFilters: () => void;
}

export const InspectorFilterBar: React.FC<InspectorFilterBarProps> = ({
  activeTab,
  setActiveTab,
  transactionsCount,
  violationsCount,
  facilityFilterType,
  setFacilityFilterType,
  hqTransactionsCount,
  branchTransactionsCount,
  selectedFacility,
  setSelectedFacility,
  selectedTxnType,
  setSelectedTxnType,
  searchQuery,
  setSearchQuery,
  facilities,
  drugSearch,
  setDrugSearch,
  onClearFilters,
}) => {
  const hasActiveFilters = searchQuery || selectedFacility || selectedTxnType || facilityFilterType !== "ALL";

  return (
    <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Nhóm Tab chức năng chính */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ledger" 
                ? "bg-[#0057cd] text-white shadow-xs" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileText size={15} /> Sổ Cái Toàn Chuỗi ({transactionsCount})
          </button>
          <button
            onClick={() => setActiveTab("violations")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "violations" 
                ? "bg-rose-600 text-white shadow-xs" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <AlertTriangle size={15} /> Radar Vi Phạm Y Tế ({violationsCount})
          </button>
          <button
            onClick={() => setActiveTab("drugs")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "drugs" 
                ? "bg-[#0057cd] text-white shadow-xs" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Pill size={15} /> Danh Mục 2.331 Thuốc Quốc Gia
          </button>
        </div>

        {/* Bộ lọc nhanh phân hệ Kho Tổng vs Chi Nhánh */}
        {activeTab === "ledger" && (
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFacilityFilterType("ALL")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                facilityFilterType === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tất cả ({transactionsCount})
            </button>
            <button
              onClick={() => setFacilityFilterType("HQ")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                facilityFilterType === "HQ" ? "bg-blue-600 text-white" : "text-blue-700 hover:bg-blue-50"
              }`}
            >
              <Warehouse size={13} />
              <span>Kho Tổng GSP ({hqTransactionsCount})</span>
            </button>
            <button
              onClick={() => setFacilityFilterType("BRANCH")}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                facilityFilterType === "BRANCH" ? "bg-emerald-600 text-white" : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Store size={13} />
              <span>Chi nhánh GPP ({branchTransactionsCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Dòng điều khiển lọc Sổ Cái */}
      {activeTab === "ledger" && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd]"
            aria-label="Lọc theo cơ sở"
          >
            <option value="">Tất cả cơ sở (1 Kho Tổng + 4 Chi nhánh)</option>
            {facilities.map((f) => (
              <option key={f.facility_code} value={f.facility_code}>
                {f.facility_code} - {f.name} ({f.facility_type === "KHO_TONG_GSP" ? "Kho Tổng GSP" : "Chi nhánh GPP"})
              </option>
            ))}
          </select>

          <select
            value={selectedTxnType}
            onChange={(e) => setSelectedTxnType(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd]"
            aria-label="Lọc theo loại giao dịch"
          >
            <option value="">Tất cả loại giao dịch</option>
            <option value="STOCK_IN">Nhập Hàng (Stock-In)</option>
            <option value="STOCK_OUT">Xuất Hàng (Stock-Out)</option>
            <option value="STOCK_TAKING">Kiểm Kê Kho (Stock-Taking)</option>
          </select>

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Tìm mã giao dịch, số chứng từ, nhà cung cấp, khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0057cd] focus:ring-1 focus:ring-[#0057cd]"
              aria-label="Tìm kiếm giao dịch"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Dòng tìm kiếm Danh mục Thuốc */}
      {activeTab === "drugs" && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tìm biệt dược, hoạt chất, số đăng ký..."
            value={drugSearch}
            onChange={(e) => setDrugSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0057cd] focus:ring-1 focus:ring-[#0057cd]"
            aria-label="Tìm kiếm thuốc"
          />
        </div>
      )}
    </div>
  );
};
