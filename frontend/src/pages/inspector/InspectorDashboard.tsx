// Bảng Điều Khiển Giám Sát & Liên Thông CSDL Dược Quốc Gia
// Phân hệ Thanh Tra Bộ Y Tế & Chuỗi Nhà Thuốc WDP301
// Tuân thủ Quyết định 232/QĐ-TTYQG & Thông tư 11/2025/TT-BYT

import { useInspectorData } from "../../hooks/useInspectorData";
import {
  InspectorHeader,
  InspectorMetrics,
  InspectorFilterBar,
  LedgerTable,
  ViolationsRadar,
  NationalDrugsCatalog,
  TransactionJsonModal,
} from "../../components/inspector";

// Tái xuất các kiểu dữ liệu từ components/inspector để tương thích ngược 100%
export * from "../../components/inspector/types";

export function InspectorDashboard() {
  const {
    activeTab,
    setActiveTab,
    loading,
    transactions,
    facilities,
    selectedFacility,
    setSelectedFacility,
    selectedTxnType,
    setSelectedTxnType,
    facilityFilterType,
    setFacilityFilterType,
    searchQuery,
    setSearchQuery,
    selectedTxn,
    setSelectedTxn,
    showJsonModal,
    setShowJsonModal,
    copiedId,
    handleCopyId,
    drugs,
    drugSearch,
    setDrugSearch,
    drugsLoading,
    fetchInspectorData,
    filteredTxns,
    violations,
    hqTransactionsCount,
    branchTransactionsCount,
    complianceRate,
  } = useInspectorData();

  // Xóa toàn bộ bộ lọc Sổ Cái
  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedFacility("");
    setSelectedTxnType("");
    setFacilityFilterType("ALL");
  };

  // Mở modal soi chi tiết JSON của giao dịch
  const handleInspectJson = (txn: any) => {
    setSelectedTxn(txn);
    setShowJsonModal(true);
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
      {/* ─── 1. Banner Tiêu Đề Giám Sát CSDL Dược Quốc Gia ─── */}
      <InspectorHeader
        loading={loading}
        onRefresh={fetchInspectorData}
      />

      {/* ─── 2. Bộ 4 Chỉ Số Đo Lường KPI Chuỗi (GSP / GPP) ─── */}
      <InspectorMetrics
        metrics={{
          facilitiesCount: facilities.length,
          totalTransactions: transactions.length,
          hqCount: hqTransactionsCount,
          branchCount: branchTransactionsCount,
          complianceRate,
          violationsCount: violations.length,
        }}
      />

      {/* ─── 3. Thùng Chứa Danh Mục Tab & Dữ Liệu Bảng Biểu ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
        {/* Thanh Điều Hướng & Bộ Lọc Đa Chiều */}
        <InspectorFilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          transactionsCount={transactions.length}
          violationsCount={violations.length}
          facilityFilterType={facilityFilterType}
          setFacilityFilterType={setFacilityFilterType}
          hqTransactionsCount={hqTransactionsCount}
          branchTransactionsCount={branchTransactionsCount}
          selectedFacility={selectedFacility}
          setSelectedFacility={setSelectedFacility}
          selectedTxnType={selectedTxnType}
          setSelectedTxnType={setSelectedTxnType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          facilities={facilities}
          drugSearch={drugSearch}
          setDrugSearch={setDrugSearch}
          onClearFilters={handleClearFilters}
        />

        {/* Tab 1: Sổ Cái Giao Dịch Toàn Chuỗi */}
        {activeTab === "ledger" && (
          <LedgerTable
            transactions={filteredTxns}
            copiedId={copiedId}
            onCopyId={handleCopyId}
            onInspectJson={handleInspectJson}
          />
        )}

        {/* Tab 2: Radar Cảnh Báo Vi Phạm Y Tế */}
        {activeTab === "violations" && (
          <ViolationsRadar
            violations={violations}
            onInspectJson={handleInspectJson}
          />
        )}

        {/* Tab 3: Danh Mục Thuốc Quốc Gia Đã Liên Thông */}
        {activeTab === "drugs" && (
          <NationalDrugsCatalog
            drugs={drugs}
            loading={drugsLoading}
          />
        )}
      </div>

      {/* ─── 4. Modal Soi Gói Tin JSON Chuẩn QĐ 232/QĐ-TTYQG ─── */}
      <TransactionJsonModal
        isOpen={showJsonModal}
        transaction={selectedTxn}
        onClose={() => setShowJsonModal(false)}
        onCopyJson={handleCopyId}
      />
    </div>
  );
}

export default InspectorDashboard;
